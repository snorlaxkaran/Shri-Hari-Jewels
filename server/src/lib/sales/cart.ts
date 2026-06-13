import { randomUUID } from "crypto";
import { prisma } from "../db.js";
import { toInvoice } from "../invoices/mappers.js";
import { createInvoiceForSale } from "../invoices/service.js";
import { getStockStatus } from "../inventory/status.js";
import {
  closeUpiQrCode,
  createUpiQrCode,
  isRazorpayEnabled,
} from "../payments/razorpay.js";
import { buildUpiPaymentString } from "../payments/upi.js";
import { getShopSettings } from "../settings/service.js";
import type {
  CartSaleItemInput,
  PaymentMode,
  RecordCartSaleInput,
  RecordCartSaleResult,
} from "../../types.js";
import { toSale } from "./mappers.js";
import { SaleError } from "./errors.js";

const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Card"];

type ValidatedCartItem = {
  itemCode: string;
  unit: Awaited<ReturnType<typeof loadUnit>>;
  product: Awaited<ReturnType<typeof loadUnit>>["product"];
  discount: number;
  dealPrice: number;
};

const loadUnit = async (itemCode: string) => {
  const unit = await prisma.inventoryUnit.findUnique({
    where: { itemCode: itemCode.trim() },
    include: { product: true, sale: true },
  });

  if (!unit) throw new SaleError(`Item code not found: ${itemCode}`, 404);
  if (unit.status !== "Available") {
    throw new SaleError(`${itemCode} is ${unit.status} and cannot be sold.`, 400);
  }
  if (unit.sale) {
    throw new SaleError(`${itemCode} already has a sale record.`, 400);
  }

  return unit;
};

const validateCartInput = async (input: RecordCartSaleInput) => {
  if (!input.items?.length) {
    throw new SaleError("Add at least one item to the cart.");
  }
  if (!input.customerId) throw new SaleError("Customer is required.");
  if (!PAYMENT_MODES.includes(input.paymentMode)) {
    throw new SaleError("Invalid payment mode.");
  }

  const customer = await prisma.customer.findUnique({
    where: { id: input.customerId },
  });
  if (!customer) throw new SaleError("Customer not found.", 404);

  const codes = new Set<string>();
  const validated: ValidatedCartItem[] = [];

  for (const item of input.items) {
    const itemCode = item.itemCode.trim();
    if (!itemCode) throw new SaleError("Each cart item needs an item code.");
    if (codes.has(itemCode)) {
      throw new SaleError(`Duplicate item code in cart: ${itemCode}`);
    }
    codes.add(itemCode);

    if (!item.dealPrice || item.dealPrice <= 0) {
      throw new SaleError(`Invalid deal price for ${itemCode}.`);
    }

    const unit = await loadUnit(itemCode);
    validated.push({
      itemCode,
      unit,
      product: unit.product,
      discount: Math.max(0, item.discount ?? 0),
      dealPrice: item.dealPrice,
    });
  }

  return { customer, items: validated };
};

const completeOneSaleInTx = async (
  saleId: string,
  paymentRef: string | undefined,
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
) => {
  const sale = await tx.sale.findUnique({
    where: { id: saleId },
    include: { unit: { include: { product: true } } },
  });
  if (!sale) throw new SaleError("Sale not found.", 404);
  if (sale.paymentStatus === "Completed") {
    const existingInvoice = await tx.invoice.findUnique({
      where: { saleId },
    });
    if (!existingInvoice) throw new SaleError("Invoice not found.", 404);
    return { sale, invoice: toInvoice(existingInvoice) };
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

  await tx.inventoryUnit.update({
    where: { id: sale.unitId },
    data: { status: "Sold" },
  });

  const product = sale.unit.product;
  const newStock = product.stock - 1;
  await tx.product.update({
    where: { id: product.id },
    data: {
      stock: newStock,
      status: getStockStatus(newStock),
    },
  });

  const invoice = await createInvoiceForSale(updatedSale, tx);
  return { sale: updatedSale, invoice };
};

export const completeCartGroup = async (
  cartGroupId: string,
  paymentRef?: string,
): Promise<RecordCartSaleResult> => {
  const groupSales = await prisma.sale.findMany({
    where: { cartGroupId },
    orderBy: { soldAt: "asc" },
  });
  if (groupSales.length === 0) {
    throw new SaleError("Cart not found.", 404);
  }

  const allCompleted = groupSales.every((s) => s.paymentStatus === "Completed");
  if (allCompleted) {
    const withInvoices = await prisma.sale.findMany({
      where: { cartGroupId },
      include: { invoice: true },
    });
    return {
      sales: withInvoices.map(toSale),
      invoices: withInvoices
        .map((s) => (s.invoice ? toInvoice(s.invoice) : null))
        .filter((i): i is NonNullable<typeof i> => i !== null),
      total: withInvoices.reduce((sum, s) => sum + s.dealPrice, 0),
      primarySaleId: groupSales[0].id,
      requiresConfirmation: false,
      autoCapture: isRazorpayEnabled(),
    };
  }

  const qrId = groupSales.find((s) => s.razorpayQrId)?.razorpayQrId;

  const results = await prisma.$transaction(async (tx) => {
    const completed = [];
    for (const sale of groupSales) {
      if (sale.paymentStatus === "Completed") continue;
      completed.push(await completeOneSaleInTx(sale.id, paymentRef, tx));
    }
    return completed;
  });

  if (qrId) await closeUpiQrCode(qrId);

  const sales = results.map((r) => toSale(r.sale));
  const invoices = results.map((r) => r.invoice);

  return {
    sales,
    invoices,
    total: sales.reduce((sum, s) => sum + s.dealPrice, 0),
    primarySaleId: groupSales[0].id,
    requiresConfirmation: false,
    autoCapture: isRazorpayEnabled(),
  };
};

export const cancelCartGroup = async (cartGroupId: string): Promise<void> => {
  const groupSales = await prisma.sale.findMany({ where: { cartGroupId } });
  if (groupSales.length === 0) throw new SaleError("Cart not found.", 404);

  const pending = groupSales.filter((s) => s.paymentStatus === "Pending");
  if (pending.length === 0) {
    throw new SaleError("Only pending UPI sales can be cancelled.", 400);
  }

  const qrId = groupSales.find((s) => s.razorpayQrId)?.razorpayQrId;
  if (qrId) await closeUpiQrCode(qrId);

  await prisma.$transaction(async (tx) => {
    for (const sale of pending) {
      await tx.inventoryUnit.update({
        where: { id: sale.unitId },
        data: { status: "Available" },
      });
      await tx.sale.delete({ where: { id: sale.id } });
    }
  });
};

export const recordCartSale = async (
  input: RecordCartSaleInput,
): Promise<RecordCartSaleResult> => {
  const { customer, items } = await validateCartInput(input);
  const total = items.reduce((sum, i) => sum + i.dealPrice, 0);
  const cartGroupId = items.length > 1 ? randomUUID() : undefined;

  if (input.paymentMode === "UPI") {
    const useRazorpay = isRazorpayEnabled();
    if (!useRazorpay) {
      const settings = await getShopSettings();
      if (!settings.upiVpa) {
        throw new SaleError(
          "UPI is not configured. Add Razorpay API keys or set a UPI ID in Settings.",
          400,
        );
      }
    }

    const pendingSales = await prisma.$transaction(async (tx) => {
      const created = [];
      for (const item of items) {
        const sale = await tx.sale.create({
          data: {
            branchId: item.unit.branchId,
            unitId: item.unit.id,
            itemCode: item.unit.itemCode,
            productId: item.product.id,
            productName: item.product.name,
            sku: item.product.sku,
            category: item.product.category,
            listPrice: item.product.price,
            discount: item.discount,
            dealPrice: item.dealPrice,
            paymentMode: "UPI",
            paymentStatus: "Pending",
            cartGroupId: cartGroupId ?? null,
            customerId: customer.id,
            customerPhone: customer.mobile,
            customerName: customer.name,
          },
        });
        await tx.inventoryUnit.update({
          where: { id: item.unit.id },
          data: { status: "Reserved" },
        });
        created.push(sale);
      }
      return created;
    });

    const primary = pendingSales[0];
    const itemCodes = items.map((i) => i.itemCode).join(", ");

    if (useRazorpay) {
      const qr = await createUpiQrCode(
        primary.id,
        total,
        `Cart sale (${items.length} items)`,
      );
      await prisma.sale.updateMany({
        where: { id: { in: pendingSales.map((s) => s.id) } },
        data: { razorpayQrId: qr.id },
      });
      const updated = await prisma.sale.findMany({
        where: { id: { in: pendingSales.map((s) => s.id) } },
      });

      return {
        sales: updated.map(toSale),
        total,
        primarySaleId: primary.id,
        requiresConfirmation: true,
        autoCapture: true,
        upiQrImageUrl: qr.image_url,
      };
    }

    const settings = await getShopSettings();
    const upiQrString = buildUpiPaymentString({
      vpa: settings.upiVpa!,
      payeeName: settings.businessName,
      amount: total,
      transactionNote: `Cart ${itemCodes}`,
    });

    return {
      sales: pendingSales.map(toSale),
      total,
      primarySaleId: primary.id,
      requiresConfirmation: true,
      autoCapture: false,
      upiQrString,
    };
  }

  const results = await prisma.$transaction(async (tx) => {
    const completed = [];
    const stockByProduct = new Map<string, number>();

    for (const item of items) {
      const created = await tx.sale.create({
        data: {
          branchId: item.unit.branchId,
          unitId: item.unit.id,
          itemCode: item.unit.itemCode,
          productId: item.product.id,
          productName: item.product.name,
          sku: item.product.sku,
          category: item.product.category,
          listPrice: item.product.price,
          discount: item.discount,
          dealPrice: item.dealPrice,
          paymentMode: input.paymentMode,
          paymentStatus: "Completed",
          cartGroupId: cartGroupId ?? null,
          customerId: customer.id,
          customerPhone: customer.mobile,
          customerName: customer.name,
        },
      });

      await tx.inventoryUnit.update({
        where: { id: item.unit.id },
        data: { status: "Sold" },
      });

      const currentStock =
        stockByProduct.get(item.product.id) ?? item.product.stock;
      const newStock = currentStock - 1;
      stockByProduct.set(item.product.id, newStock);
      await tx.product.update({
        where: { id: item.product.id },
        data: {
          stock: newStock,
          status: getStockStatus(newStock),
        },
      });

      const invoice = await createInvoiceForSale(created, tx);
      completed.push({ sale: created, invoice });
    }
    return completed;
  });

  return {
    sales: results.map((r) => toSale(r.sale)),
    invoices: results.map((r) => r.invoice),
    total,
    primarySaleId: results[0].sale.id,
    requiresConfirmation: false,
    autoCapture: false,
  };
};

export const syncPendingCartPayment = async (
  saleId: string,
): Promise<RecordCartSaleResult> => {
  const sale = await prisma.sale.findUnique({ where: { id: saleId } });
  if (!sale) throw new SaleError("Sale not found.", 404);

  if (sale.cartGroupId) {
    const groupSales = await prisma.sale.findMany({
      where: { cartGroupId: sale.cartGroupId },
    });
    if (groupSales.every((s) => s.paymentStatus === "Completed")) {
      return completeCartGroup(sale.cartGroupId);
    }

    const qrId = groupSales.find((s) => s.razorpayQrId)?.razorpayQrId;
    if (!qrId) {
      return {
        sales: groupSales.map(toSale),
        total: groupSales.reduce((sum, s) => sum + s.dealPrice, 0),
        primarySaleId: saleId,
        requiresConfirmation: true,
        autoCapture: false,
      };
    }

    const { findCapturedPaymentForQr } = await import("../payments/razorpay.js");
    const payment = await findCapturedPaymentForQr(qrId);
    if (payment) {
      await prisma.sale.updateMany({
        where: { cartGroupId: sale.cartGroupId },
        data: { razorpayPaymentId: payment.id },
      });
      return completeCartGroup(sale.cartGroupId, payment.id);
    }

    return {
      sales: groupSales.map(toSale),
      total: groupSales.reduce((sum, s) => sum + s.dealPrice, 0),
      primarySaleId: saleId,
      requiresConfirmation: true,
      autoCapture: true,
    };
  }

  throw new SaleError("Not a cart sale.", 400);
};
