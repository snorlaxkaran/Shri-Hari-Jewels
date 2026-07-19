import { prisma } from "../db.js";
import type { Invoice, InvoiceItem } from "../../types.js";
import { defaultHsnForMetal } from "./gst.js";
import {
  computeGstBreakupForPdf,
  groupLinesByJewelryCategory,
  groupLinesWithFallback,
  isIntraStateSupply,
  type GroupedJewelryLine,
  type GstBreakupValues,
} from "./gst-invoice-layout.js";
import type { ShopSettings } from "../../types.js";
import { moneyToNumber } from "../money.js";

const saleToInvoiceItem = (sale: {
  id: string;
  itemCode: string;
  productName: string;
  sku: string;
  category: string;
  listPrice: unknown;
  discount: unknown;
  dealPrice: unknown;
  metal?: string;
  huid?: string | null;
}): InvoiceItem => {
  const metal = sale.metal ?? sale.category;
  const huid = sale.huid?.trim() || undefined;
  return {
    id: sale.id,
    saleId: sale.id,
    itemCode: sale.itemCode,
    productName: sale.productName,
    sku: sale.sku,
    hsnCode: defaultHsnForMetal(metal),
    metal,
    listPrice: moneyToNumber(String(sale.listPrice)),
    discount: moneyToNumber(String(sale.discount)),
    amount: moneyToNumber(String(sale.dealPrice)),
    huid,
  };
};

export const enrichItemsWithSaleHuids = async (items: InvoiceItem[]): Promise<InvoiceItem[]> => {
  const saleIds = items
    .map((item) => item.saleId)
    .filter((id): id is string => Boolean(id));
  if (saleIds.length === 0) {
    return items;
  }

  const sales = await prisma.sale.findMany({
    where: { id: { in: saleIds } },
    select: {
      id: true,
      unit: { select: { huid: true, hallmarkNumber: true } },
    },
  });
  const huidBySaleId = new Map(
    sales.map((sale) => [
      sale.id,
      sale.unit.huid?.trim() || sale.unit.hallmarkNumber?.trim() || undefined,
    ]),
  );

  return items.map((item) => ({
    ...item,
    huid: item.huid ?? (item.saleId ? huidBySaleId.get(item.saleId) : undefined),
  }));
};

const summaryLineItem = (invoice: Invoice): InvoiceItem => ({
  id: "summary",
  itemCode: "—",
  productName: "Jewellery",
  sku: "—",
  hsnCode: defaultHsnForMetal("Base Metal"),
  metal: "Base Metal",
  listPrice: invoice.subtotal > 0 ? invoice.subtotal : invoice.taxableValue,
  discount: invoice.discount,
  amount: invoice.taxableValue,
});

export const resolveInvoiceItemsForPdf = async (
  invoice: Invoice,
  organizationId: string,
): Promise<InvoiceItem[]> => {
  if (invoice.items.length > 0) {
    return enrichItemsWithSaleHuids(invoice.items);
  }

  const saleWhere = invoice.cartGroupId
    ? {
        cartGroupId: invoice.cartGroupId,
        branch: { organizationId },
      }
    : {
        branch: { organizationId },
        customerPhone: invoice.customerMobile,
        soldAt: {
          gte: new Date(new Date(invoice.createdAt).getTime() - 10 * 60 * 1000),
          lte: new Date(new Date(invoice.createdAt).getTime() + 10 * 60 * 1000),
        },
      };

  const sales = await prisma.sale.findMany({
    where: saleWhere,
    include: {
      unit: { select: { huid: true, hallmarkNumber: true } },
    },
    orderBy: { soldAt: "asc" },
  });

  if (sales.length > 0) {
    const productIds = [...new Set(sales.map((sale) => sale.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, metal: true },
    });
    const metalByProductId = new Map(products.map((product) => [product.id, product.metal]));

    return sales.map((sale) =>
      saleToInvoiceItem({
        ...sale,
        metal: metalByProductId.get(sale.productId),
        huid: sale.unit.huid ?? sale.unit.hallmarkNumber,
      }),
    );
  }

  return invoice.taxableValue > 0 ? [summaryLineItem(invoice)] : [];
};

export const resolveGstBreakupForInvoice = (
  invoice: Invoice,
  shopState: string,
): GstBreakupValues => {
  const placeOfSupply = invoice.placeOfSupply?.trim() || shopState;
  const storedGst = invoice.cgst + invoice.sgst + invoice.igst;

  if (storedGst > 0) {
    return {
      taxableAmount: invoice.taxableValue,
      cgst: invoice.cgst,
      sgst: invoice.sgst,
      igst: invoice.igst,
      roundOff: invoice.roundOff,
      payableAmount: invoice.total,
      isIntraState: isIntraStateSupply(shopState, placeOfSupply),
    };
  }

  if (invoice.taxableValue <= 0) {
    return {
      taxableAmount: 0,
      cgst: 0,
      sgst: 0,
      igst: 0,
      roundOff: 0,
      payableAmount: invoice.total,
      isIntraState: isIntraStateSupply(shopState, placeOfSupply),
    };
  }

  const computed = computeGstBreakupForPdf(
    invoice.taxableValue,
    shopState,
    placeOfSupply,
  );

  if (Math.abs(invoice.total - invoice.taxableValue) < 0.01) {
    return computed;
  }

  return {
    ...computed,
    payableAmount: invoice.total,
    roundOff: invoice.roundOff !== 0 ? invoice.roundOff : computed.roundOff,
  };
};

export const resolveGroupedLinesForPdf = (
  items: InvoiceItem[],
  settings: ShopSettings,
  fallbackAmount: number,
  fallbackQty?: number,
): { lines: GroupedJewelryLine[]; totalQty: number; totalAmount: number } => {
  const grouped = groupLinesByJewelryCategory(
    items.map((item) => ({
      metal: item.metal || "Base Metal",
      amount: item.amount,
    })),
    settings,
  );

  if (grouped.lines.length > 0 && grouped.totalAmount > 0) {
    return grouped;
  }

  const qty = fallbackQty ?? Math.max(items.length, 1);
  const amount = fallbackAmount > 0 ? fallbackAmount : grouped.totalAmount;

  if (amount <= 0) {
    return grouped;
  }

  return groupLinesWithFallback(
    items.map((item) => ({
      metal: item.metal || "Base Metal",
      amount: item.amount,
    })),
    settings,
    amount,
    qty,
  );
};
