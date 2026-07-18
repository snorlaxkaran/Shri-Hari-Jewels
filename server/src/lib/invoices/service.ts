import type { Prisma, Sale as PrismaSale } from "@prisma/client";
import { prisma } from "../db.js";
import type { Invoice } from "../../types.js";
import { generateInvoiceNo } from "./invoice-no.js";
import { toInvoice } from "./mappers.js";
import {
  computePayableWithRoundOff,
  computeRetailGstBreakup,
  defaultHsnForMetal,
} from "./gst.js";
import { getShopSettings } from "../settings/service.js";
import { moneyToNumber, sumMoney, toMoney } from "../money.js";

const invoiceInclude = { items: true } as const;

export const listInvoices = async (organizationId: string): Promise<Invoice[]> => {
  const invoices = await prisma.invoice.findMany({
    where: { branch: { organizationId } },
    include: invoiceInclude,
    orderBy: { createdAt: "desc" },
  });
  return invoices.map(toInvoice);
};

export const getInvoice = async (
  id: string,
  organizationId: string,
): Promise<Invoice | null> => {
  const invoice = await prisma.invoice.findFirst({
    where: { id, branch: { organizationId } },
    include: invoiceInclude,
  });
  return invoice ? toInvoice(invoice) : null;
};

export const getInvoiceForSale = async (
  saleId: string,
  organizationId: string,
): Promise<Invoice | null> => {
  const item = await prisma.invoiceItem.findFirst({
    where: { saleId, invoice: { branch: { organizationId } } },
    include: { invoice: { include: invoiceInclude } },
  });
  return item ? toInvoice(item.invoice) : null;
};

export const createInvoiceForCart = async (
  sales: PrismaSale[],
  organizationId: string,
  tx: Prisma.TransactionClient,
): Promise<Invoice> => {
  if (sales.length === 0) {
    throw new Error("Cannot create invoice without sales.");
  }

  const cartGroupId = sales[0].cartGroupId;
  if (cartGroupId) {
    const existing = await tx.invoice.findFirst({
      where: { cartGroupId },
      include: invoiceInclude,
    });
    if (existing) return toInvoice(existing);
  } else if (sales.length === 1) {
    const existingItem = await tx.invoiceItem.findUnique({
      where: { saleId: sales[0].id },
      include: { invoice: { include: invoiceInclude } },
    });
    if (existingItem) return toInvoice(existingItem.invoice);
  }

  const settings = await getShopSettings(organizationId);
  const customer = sales[0].customerId
    ? await tx.customer.findUnique({ where: { id: sales[0].customerId } })
    : null;

  const placeOfSupply =
    customer?.billingState?.trim() || settings.state?.trim() || "Jammu & Kashmir";

  const products = await tx.product.findMany({
    where: { id: { in: [...new Set(sales.map((s) => s.productId))] } },
    select: { id: true, metal: true },
  });
  const metalByProductId = new Map(products.map((p) => [p.id, p.metal]));

  const subtotal = sumMoney(sales.map((s) => s.listPrice));
  const discount = sumMoney(sales.map((s) => s.discount));
  const taxableValue = sumMoney(sales.map((s) => s.dealPrice));
  const taxableNum = moneyToNumber(taxableValue);

  const gst = computeRetailGstBreakup(
    taxableNum,
    settings.state ?? "",
    placeOfSupply,
  );
  const preRound = taxableNum + gst.cgst + gst.sgst + gst.igst;
  const { payable, roundOff } = computePayableWithRoundOff(preRound);

  const existingNos = await tx.invoice.findMany({ select: { invoiceNo: true } });
  const invoiceNo = generateInvoiceNo(existingNos.map((i) => i.invoiceNo));

  const invoice = await tx.invoice.create({
    data: {
      branchId: sales[0].branchId,
      invoiceNo,
      cartGroupId: cartGroupId ?? null,
      customerId: sales[0].customerId,
      customerName: sales[0].customerName ?? "Walk-in Customer",
      customerMobile: sales[0].customerPhone,
      subtotal,
      discount,
      taxableValue,
      cgst: toMoney(gst.cgst),
      sgst: toMoney(gst.sgst),
      igst: toMoney(gst.igst),
      roundOff: toMoney(roundOff),
      total: toMoney(payable),
      paymentMode: sales[0].paymentMode,
      paymentRef: sales[0].paymentRef,
      status: "Paid",
      placeOfSupply,
      items: {
        create: sales.map((s) => ({
          saleId: s.id,
          itemCode: s.itemCode,
          productName: s.productName,
          sku: s.sku,
          hsnCode: defaultHsnForMetal(metalByProductId.get(s.productId) ?? "Base Metal"),
          metal: metalByProductId.get(s.productId) ?? "Base Metal",
          listPrice: s.listPrice,
          discount: s.discount,
          amount: s.dealPrice,
        })),
      },
    },
    include: invoiceInclude,
  });

  return toInvoice(invoice);
};

/** @deprecated Use createInvoiceForCart — kept for any legacy call sites during transition. */
export const createInvoiceForSale = async (
  sale: PrismaSale,
  tx: Prisma.TransactionClient,
  organizationId: string,
): Promise<Invoice> => createInvoiceForCart([sale], organizationId, tx);
