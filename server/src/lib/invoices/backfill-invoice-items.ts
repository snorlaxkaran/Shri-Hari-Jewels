import type { Invoice as PrismaInvoice, InvoiceItem as PrismaInvoiceItem, Sale } from "@prisma/client";
import { prisma } from "../db.js";
import { defaultHsnForMetal } from "./gst.js";
import { toMoney } from "../money.js";

type InvoiceWithItems = PrismaInvoice & { items: PrismaInvoiceItem[] };

const findSalesForInvoice = async (
  invoice: PrismaInvoice,
  organizationId: string,
): Promise<Sale[]> => {
  if (invoice.cartGroupId) {
    return prisma.sale.findMany({
      where: {
        cartGroupId: invoice.cartGroupId,
        branch: { organizationId },
      },
      orderBy: { soldAt: "asc" },
    });
  }

  const windowStart = new Date(invoice.createdAt.getTime() - 10 * 60 * 1000);
  const windowEnd = new Date(invoice.createdAt.getTime() + 10 * 60 * 1000);

  const candidates = await prisma.sale.findMany({
    where: {
      branchId: invoice.branchId,
      branch: { organizationId },
      customerPhone: invoice.customerMobile,
      soldAt: { gte: windowStart, lte: windowEnd },
      invoiceItem: { is: null },
    },
    orderBy: { soldAt: "asc" },
  });

  if (candidates.length <= 1) {
    return candidates;
  }

  // Prefer sales whose deal prices sum to the invoice taxable value.
  const target = Number(invoice.taxableValue);
  const exactSubset = candidates.filter((sale) => Number(sale.dealPrice) === target);
  if (exactSubset.length === 1) {
    return exactSubset;
  }

  let running = 0;
  const matched: Sale[] = [];
  for (const sale of candidates) {
    if (running >= target - 0.01) break;
    matched.push(sale);
    running += Number(sale.dealPrice);
  }

  if (Math.abs(running - target) < 1) {
    return matched;
  }

  return candidates;
};

export const backfillMissingInvoiceItems = async (
  invoice: InvoiceWithItems,
  organizationId: string,
): Promise<InvoiceWithItems> => {
  if (invoice.items.length > 0) {
    return invoice;
  }

  const sales = await findSalesForInvoice(invoice, organizationId);

  if (sales.length > 0) {
    const productIds = [...new Set(sales.map((sale) => sale.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, metal: true },
    });
    const metalByProductId = new Map(products.map((product) => [product.id, product.metal]));

    await prisma.invoiceItem.createMany({
      data: sales.map((sale) => {
        const metal = metalByProductId.get(sale.productId) ?? sale.category;
        return {
          invoiceId: invoice.id,
          saleId: sale.id,
          itemCode: sale.itemCode,
          productName: sale.productName,
          sku: sale.sku,
          hsnCode: defaultHsnForMetal(metal),
          metal,
          listPrice: sale.listPrice,
          discount: sale.discount,
          amount: sale.dealPrice,
        };
      }),
      skipDuplicates: true,
    });
  } else if (Number(invoice.taxableValue) > 0) {
    await prisma.invoiceItem.create({
      data: {
        invoiceId: invoice.id,
        itemCode: invoice.repairOrderId ? "REPAIR" : "SUMMARY",
        productName: invoice.repairOrderId ? "Repair service" : "Jewellery",
        sku: invoice.repairOrderId ? "REPAIR-SVC" : "SUMMARY",
        hsnCode: invoice.repairOrderId ? "9988" : defaultHsnForMetal("Base Metal"),
        metal: invoice.repairOrderId ? "Service" : "Base Metal",
        listPrice: invoice.subtotal.gt(0) ? invoice.subtotal : invoice.taxableValue,
        discount: invoice.discount,
        amount: invoice.taxableValue,
      },
    });
  } else {
    return invoice;
  }

  return prisma.invoice.findUniqueOrThrow({
    where: { id: invoice.id },
    include: { items: true },
  });
};

export const backfillMissingInvoiceItemsBatch = async (
  invoices: InvoiceWithItems[],
  organizationId: string,
): Promise<InvoiceWithItems[]> => {
  const needsBackfill = invoices.filter((invoice) => invoice.items.length === 0);
  if (needsBackfill.length === 0) {
    return invoices;
  }

  const backfilled = await Promise.all(
    needsBackfill.map((invoice) => backfillMissingInvoiceItems(invoice, organizationId)),
  );
  const byId = new Map(backfilled.map((invoice) => [invoice.id, invoice]));

  return invoices.map((invoice) => byId.get(invoice.id) ?? invoice);
};

/** Recompute GST header fields when legacy rows stored tax as zero. */
export const backfillMissingInvoiceGst = async (
  invoice: InvoiceWithItems,
  organizationId: string,
): Promise<InvoiceWithItems> => {
  const storedGst =
    Number(invoice.cgst) + Number(invoice.sgst) + Number(invoice.igst);
  if (storedGst > 0 || Number(invoice.taxableValue) <= 0) {
    return invoice;
  }

  const settings = await prisma.shopSettings.findFirst({
    where: { organizationId },
    select: { state: true },
  });
  const shopState = settings?.state?.trim() ?? "";
  const placeOfSupply = invoice.placeOfSupply?.trim() || shopState;
  const taxable = Number(invoice.taxableValue);
  const isIntraState =
    placeOfSupply.length > 0 &&
    shopState.length > 0 &&
    placeOfSupply.toLowerCase() === shopState.toLowerCase();

  const cgst = isIntraState ? Math.round(taxable * 0.015 * 100) / 100 : 0;
  const sgst = isIntraState ? Math.round(taxable * 0.015 * 100) / 100 : 0;
  const igst = isIntraState ? 0 : Math.round(taxable * 0.03 * 100) / 100;
  const rawPayable = taxable + cgst + sgst + igst;
  const payable = Math.round(rawPayable);
  const roundOff = Math.round((payable - rawPayable) * 100) / 100;

  return prisma.invoice.update({
    where: { id: invoice.id },
    data: {
      cgst: toMoney(cgst),
      sgst: toMoney(sgst),
      igst: toMoney(igst),
      roundOff: toMoney(roundOff),
      total: toMoney(
        Math.abs(Number(invoice.total) - taxable) < 0.01 ? payable : Number(invoice.total),
      ),
    },
    include: { items: true },
  });
};

export const ensureInvoiceRecordsComplete = async (
  invoice: InvoiceWithItems,
  organizationId: string,
): Promise<InvoiceWithItems> => {
  const withItems = await backfillMissingInvoiceItems(invoice, organizationId);
  return backfillMissingInvoiceGst(withItems, organizationId);
};
