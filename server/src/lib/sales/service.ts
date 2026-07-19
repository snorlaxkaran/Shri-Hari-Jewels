import { organizationBranchFilter } from "../branches/access.js";
import { InventoryUnitStatus, SalePaymentStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { toInvoice } from "../invoices/mappers.js";
import { createInvoiceForCart, getInvoiceForSale } from "../invoices/service.js";
import { queueAutoEInvoiceGeneration } from "../einvoice/auto-generate.js";
import { syncProductStockInTx } from "../inventory/stock-sync.js";
import { recordSaleAuditInTx } from "./audit.js";
import {
  closeUpiQrCode,
  createUpiQrCode,
  findCapturedPaymentForQr,
  isRazorpayEnabled,
} from "../payments/razorpay.js";
import { buildUpiPaymentString } from "../payments/upi.js";
import { getShopSettingsByBranchId } from "../settings/service.js";
import { getCurrentMarketRates } from "../market-rates/service.js";
import {
  computeListPriceBreakdownForProduct,
} from "../inventory/unit-pricing.js";
import {
  isHallmarked,
  requiresHallmark,
} from "../hallmark/requires-hallmark.js";
import { moneyToNumber } from "../money.js";
import type {
  PaymentMode,
  RecordCartSaleResult,
  RecordSaleInput,
  RecordSaleResult,
  Sale,
} from "../../types.js";
import { cancelCartGroup, completeCartGroup } from "./cart.js";
import { toSale } from "./mappers.js";

const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Card"];

import { DiscountApprovalError, assertDiscountApproved } from "../discount-approval/service.js";
import { SaleError } from "./errors.js";

export { SaleError } from "./errors.js";

export const listSales = async (
  organizationId: string,
  branchId?: string,
): Promise<Sale[]> => {
  const sales = await prisma.sale.findMany({
    where: organizationBranchFilter(organizationId, branchId),
    orderBy: { soldAt: "desc" },
  });
  return sales.map(toSale);
};

export const getSaleById = async (
  saleId: string,
  organizationId: string,
): Promise<Sale | null> => {
  const sale = await prisma.sale.findFirst({
    where: { id: saleId, branch: { organizationId } },
  });
  return sale ? toSale(sale) : null;
};

export const lookupUnitForSale = async (
  itemCode: string,
  organizationId: string,
  branchId?: string,
) => {
  const unit = await prisma.inventoryUnit.findFirst({
    where: {
      itemCode: itemCode.trim(),
      ...organizationBranchFilter(organizationId, branchId),
    },
    include: { product: true, sale: true },
  });

  if (!unit) {
    throw new SaleError("Item code not found.", 404);
  }
  if (branchId && unit.branchId !== branchId) {
    throw new SaleError("This item is not assigned to your store.", 403);
  }
  if (unit.status !== "Available") {
    throw new SaleError(`This item is ${unit.status} and cannot be sold.`, 400);
  }
  if (unit.sale) {
    throw new SaleError("This item already has a sale record.", 400);
  }

  const product = unit.product;

  if (requiresHallmark(product) && !isHallmarked(unit)) {
    throw new SaleError(
      `${itemCode.trim()} requires BIS hallmark (HUID) before it can be sold. Record the HUID from Central Stock first.`,
      400,
    );
  }

  const marketRates = await getCurrentMarketRates();
  const { listPrice, priceBreakdown } = computeListPriceBreakdownForProduct(
    product,
    marketRates,
  );

  const hallmarkPending = false;

  return {
    itemCode: unit.itemCode,
    productName: product.name,
    sku: product.sku,
    category: product.category,
    listPrice,
    priceBreakdown,
    hallmarkPending,
    huid: unit.huid ?? unit.hallmarkNumber ?? undefined,
  };
};

const validateSaleInput = async (
  input: RecordSaleInput,
  organizationId: string,
  branchId?: string,
) => {
  const itemCode = input.itemCode.trim();

  if (!itemCode) throw new SaleError("Item code is required.");
  if (!input.customerId) throw new SaleError("Customer is required.");
  if (!input.dealPrice || input.dealPrice <= 0) {
    throw new SaleError("Deal price must be greater than zero.");
  }
  if (!PAYMENT_MODES.includes(input.paymentMode)) {
    throw new SaleError("Invalid payment mode.");
  }

  const customer = await prisma.customer.findFirst({
    where: { id: input.customerId, organizationId },
  });
  if (!customer) throw new SaleError("Customer not found.", 404);

  const unit = await prisma.inventoryUnit.findFirst({
    where: {
      itemCode,
      ...organizationBranchFilter(organizationId, branchId),
    },
    include: { product: true, sale: true },
  });

  if (!unit) throw new SaleError("Item code not found.", 404);
  if (branchId && unit.branchId !== branchId) {
    throw new SaleError("This item is not assigned to your store.", 403);
  }
  if (unit.status !== "Available") {
    throw new SaleError(`This item is ${unit.status} and cannot be sold.`, 400);
  }
  if (unit.sale)
    throw new SaleError("This item already has a sale record.", 400);

  if (requiresHallmark(unit.product) && !isHallmarked(unit)) {
    throw new SaleError(
      `${itemCode} requires BIS hallmark (HUID) before it can be sold.`,
      400,
    );
  }

  return {
    itemCode,
    customer,
    unit,
    product: unit.product,
    discount: Math.max(0, input.discount ?? 0),
  };
};

const buildCompletedResult = async (
  saleId: string,
  organizationId: string,
): Promise<RecordSaleResult> => {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) throw new SaleError("Sale not found.", 404);

  const invoice = await getInvoiceForSale(saleId, organizationId);

  return {
    sale: toSale(sale),
    invoice: invoice ?? undefined,
    requiresConfirmation: false,
    autoCapture: isRazorpayEnabled(),
  };
};

export const completeSale = async (
  saleId: string,
  paymentRef?: string,
  organizationId?: string,
): Promise<RecordSaleResult> => {
  const existing = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { branch: { select: { organizationId: true } } },
  });

  if (!existing) throw new SaleError("Sale not found.", 404);
  const orgId = organizationId ?? existing.branch.organizationId;

  if (existing.paymentStatus === "Completed") {
    const invoice = await getInvoiceForSale(saleId, orgId);
    return {
      sale: toSale(existing),
      invoice: invoice ?? undefined,
      requiresConfirmation: false,
      autoCapture: isRazorpayEnabled(),
    };
  }

  if (existing.cartGroupId) {
    const cartResult = await completeCartGroup(
      existing.cartGroupId,
      paymentRef,
    );
    return {
      sale: cartResult.sales[0],
      invoice: cartResult.invoices?.[0],
      requiresConfirmation: false,
      autoCapture: cartResult.autoCapture,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.sale.findUnique({
      where: { id: saleId },
      include: { unit: { include: { product: true } } },
    });

    if (!sale) throw new SaleError("Sale not found.", 404);
    if (sale.paymentStatus === "Completed") {
      throw new SaleError("This sale is already completed.", 400);
    }

    const updatedSale = await tx.sale.update({
      where: { id: saleId },
      data: {
        paymentStatus: "Completed",
        paymentRef: paymentRef?.trim() || sale.razorpayPaymentId || null,
        razorpayPaymentId: paymentRef?.trim() || sale.razorpayPaymentId || null,
        soldAt: new Date(),
      },
    });

    const unit = sale.unit;
    const previousStatus = unit.status;

    await tx.inventoryUnit.update({
      where: { id: sale.unitId },
      data: {
        status: InventoryUnitStatus.Sold,
        listPrice: sale.listPrice,
      },
    });

    await syncProductStockInTx(tx, sale.unit.productId, {
      reason: "sale_completed",
      performedByName: "System",
      unitId: sale.unitId,
      itemCode: sale.itemCode,
      previousUnitStatus: previousStatus,
      newUnitStatus: InventoryUnitStatus.Sold,
    });

    const invoice = await createInvoiceForCart([updatedSale], orgId, tx);
    await recordSaleAuditInTx(tx, {
      saleId: updatedSale.id,
      invoiceId: invoice.id,
      action: "Completed",
      newValue: { paymentStatus: SalePaymentStatus.Completed },
      reason: "sale_completed",
      performedByName: "System",
    });
    return { sale: updatedSale, invoice };
  });

  if (existing.razorpayQrId) {
    await closeUpiQrCode(existing.razorpayQrId);
  }

  queueAutoEInvoiceGeneration({
    organizationId: orgId,
    invoiceId: result.invoice.id,
    saleId: result.sale.id,
  });

  return {
    sale: toSale(result.sale),
    invoice: result.invoice,
    requiresConfirmation: false,
    autoCapture: isRazorpayEnabled(),
  };
};

export const syncPendingSalePayment = async (
  saleId: string,
): Promise<RecordSaleResult> => {
  const sale = await prisma.sale.findUnique({
    where: { id: saleId },
    include: { branch: { select: { organizationId: true } } },
  });
  if (!sale) throw new SaleError("Sale not found.", 404);

  if (sale.paymentStatus === "Completed") {
    return buildCompletedResult(saleId, sale.branch.organizationId);
  }

  if (!sale.razorpayQrId) {
    return {
      sale: toSale(sale),
      requiresConfirmation: true,
      autoCapture: false,
    };
  }

  const payment = await findCapturedPaymentForQr(sale.razorpayQrId);
  if (payment) {
    await prisma.sale.update({
      where: { id: saleId },
      data: { razorpayPaymentId: payment.id },
    });
    return completeSale(saleId, payment.id);
  }

  return {
    sale: toSale(sale),
    requiresConfirmation: true,
    autoCapture: true,
  };
};

export const recordSale = async (
  input: RecordSaleInput,
  organizationId: string,
  branchId: string,
  actor?: { id: string; name: string },
): Promise<RecordSaleResult> => {
  const { itemCode, customer, unit, product, discount } =
    await validateSaleInput(input, organizationId, branchId);

  const marketRates = await getCurrentMarketRates(organizationId);
  const { listPrice } = computeListPriceBreakdownForProduct(product, marketRates);

  await assertDiscountApproved(
    organizationId,
    listPrice,
    discount,
    input.discountApprovalId,
  );

  if (input.paymentMode === "UPI") {
    const useRazorpay = isRazorpayEnabled();

    if (!useRazorpay) {
      const settings = await getShopSettingsByBranchId(branchId);
      if (!settings.upiVpa) {
        throw new SaleError(
          "UPI is not configured. Add Razorpay API keys in server .env for automatic payments, or set a UPI ID in Settings for manual mode.",
          400,
        );
      }
    }

    const pendingSale = await prisma.$transaction(async (tx) => {
      const created = await tx.sale.create({
        data: {
          branchId,
          unitId: unit.id,
          itemCode: unit.itemCode,
          productId: product.id,
          productName: product.name,
          sku: product.sku,
          category: product.category,
          listPrice,
          discount,
          dealPrice: input.dealPrice,
          paymentMode: "UPI",
          paymentStatus: "Pending",
          customerId: customer.id,
          customerPhone: customer.mobile,
          customerName: customer.name,
          createdById: actor?.id,
          createdByName: actor?.name,
          discountApprovalId: input.discountApprovalId,
        },
      });

      await tx.inventoryUnit.update({
        where: { id: unit.id },
        data: { status: InventoryUnitStatus.Reserved, listPrice },
      });

      await syncProductStockInTx(tx, product.id, {
        reason: "upi_sale_pending",
        performedByName: "System",
        unitId: unit.id,
        itemCode: unit.itemCode,
        previousUnitStatus: InventoryUnitStatus.Available,
        newUnitStatus: InventoryUnitStatus.Reserved,
      });

      return created;
    });

    if (useRazorpay) {
      const qr = await createUpiQrCode(
        pendingSale.id,
        input.dealPrice,
        `Sale ${itemCode}`,
      );

      const updated = await prisma.sale.update({
        where: { id: pendingSale.id },
        data: { razorpayQrId: qr.id },
      });

      return {
        sale: toSale(updated),
        requiresConfirmation: true,
        autoCapture: true,
        upiQrImageUrl: qr.image_url,
      };
    }

    const settings = await getShopSettingsByBranchId(branchId);
    const upiQrString = buildUpiPaymentString({
      vpa: settings.upiVpa!,
      payeeName: settings.businessName,
      amount: input.dealPrice,
      transactionNote: `Sale ${itemCode}`,
    });

    return {
      sale: toSale(pendingSale),
      requiresConfirmation: true,
      autoCapture: false,
      upiQrString,
    };
  }

  const result = await prisma.$transaction(async (tx) => {
    const created = await tx.sale.create({
      data: {
        branchId,
        unitId: unit.id,
        itemCode: unit.itemCode,
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        category: product.category,
        listPrice,
        discount,
        dealPrice: input.dealPrice,
        paymentMode: input.paymentMode,
        paymentStatus: "Completed",
        customerId: customer.id,
        customerPhone: customer.mobile,
        customerName: customer.name,
        createdById: actor?.id,
        createdByName: actor?.name,
        discountApprovalId: input.discountApprovalId,
      },
    });

    await tx.inventoryUnit.update({
      where: { id: unit.id },
      data: { status: InventoryUnitStatus.Sold, listPrice },
    });

    await syncProductStockInTx(tx, product.id, {
      reason: "sale_recorded",
      performedByName: "System",
      unitId: unit.id,
      itemCode: unit.itemCode,
      previousUnitStatus: InventoryUnitStatus.Available,
      newUnitStatus: InventoryUnitStatus.Sold,
    });

    const invoice = await createInvoiceForCart([created], organizationId, tx);
    await recordSaleAuditInTx(tx, {
      saleId: created.id,
      invoiceId: invoice.id,
      action: "Recorded",
      newValue: { paymentStatus: SalePaymentStatus.Completed },
      reason: "immediate_sale",
      performedByName: "System",
    });
    return { sale: created, invoice };
  });

  queueAutoEInvoiceGeneration({
    organizationId,
    invoiceId: result.invoice.id,
    saleId: result.sale.id,
  });

  return {
    sale: toSale(result.sale),
    invoice: result.invoice,
    requiresConfirmation: false,
    autoCapture: false,
  };
};

export const confirmSalePayment = async (
  saleId: string,
  paymentRef?: string,
): Promise<RecordSaleResult | RecordCartSaleResult> => {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) throw new SaleError("Sale not found.", 404);
  if (sale.cartGroupId) {
    return completeCartGroup(sale.cartGroupId, paymentRef);
  }
  return completeSale(saleId, paymentRef);
};

export const cancelPendingSale = async (saleId: string): Promise<void> => {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) throw new SaleError("Sale not found.", 404);
  if (sale.paymentStatus !== "Pending") {
    throw new SaleError("Only pending UPI sales can be cancelled.", 400);
  }

  if (sale.cartGroupId) {
    await cancelCartGroup(sale.cartGroupId);
    return;
  }

  if (sale.razorpayQrId) {
    await closeUpiQrCode(sale.razorpayQrId);
  }

  await prisma.$transaction(async (tx) => {
    const unit = await tx.inventoryUnit.findUnique({
      where: { id: sale.unitId },
      select: { status: true, itemCode: true },
    });

    await tx.inventoryUnit.update({
      where: { id: sale.unitId },
      data: { status: "Available" },
    });

    if (unit) {
      await syncProductStockInTx(tx, sale.productId, {
        reason: "sale_cancelled",
        performedByName: "System",
        unitId: sale.unitId,
        itemCode: unit.itemCode,
        previousUnitStatus: unit.status,
        newUnitStatus: InventoryUnitStatus.Available,
      });
    } else {
      await syncProductStockInTx(tx, sale.productId);
    }

    await tx.sale.delete({ where: { id: saleId } });
  });
};

export const handleRazorpayWebhookSale = async (
  saleId: string,
  paymentId: string,
): Promise<void> => {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale || sale.paymentStatus === "Completed") return;

  await prisma.sale.update({
    where: { id: saleId },
    data: { razorpayPaymentId: paymentId },
  });

  await completeSale(saleId, paymentId);
};
