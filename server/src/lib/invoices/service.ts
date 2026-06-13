import type { Prisma, Sale as PrismaSale } from "@prisma/client";
import { prisma } from "../db.js";
import type { Invoice } from "../../types.js";
import { generateInvoiceNo } from "./invoice-no.js";
import { toInvoice } from "./mappers.js";

export const listInvoices = async (): Promise<Invoice[]> => {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
  });
  return invoices.map(toInvoice);
};

export const getInvoice = async (id: string): Promise<Invoice | null> => {
  const invoice = await prisma.invoice.findUnique({ where: { id } });
  return invoice ? toInvoice(invoice) : null;
};

export const createInvoiceForSale = async (
  sale: PrismaSale,
  tx: Prisma.TransactionClient,
): Promise<Invoice> => {
  const existing = await tx.invoice.findMany({ select: { invoiceNo: true } });
  const invoiceNo = generateInvoiceNo(existing.map((i) => i.invoiceNo));

  const invoice = await tx.invoice.create({
    data: {
      branchId: sale.branchId,
      invoiceNo,
      saleId: sale.id,
      customerId: sale.customerId,
      customerName: sale.customerName ?? "Walk-in Customer",
      customerMobile: sale.customerPhone,
      itemCode: sale.itemCode,
      productName: sale.productName,
      sku: sale.sku,
      listPrice: sale.listPrice,
      discount: sale.discount,
      total: sale.dealPrice,
      paymentMode: sale.paymentMode,
      paymentRef: sale.paymentRef,
      status: "Paid",
    },
  });

  return toInvoice(invoice);
};
