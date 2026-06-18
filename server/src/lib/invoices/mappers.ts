import type { Invoice as PrismaInvoice } from "@prisma/client";
import type { Invoice } from "../../types.js";
import { moneyToNumber } from "../money.js";

export const toInvoice = (invoice: PrismaInvoice): Invoice => ({
  id: invoice.id,
  invoiceNo: invoice.invoiceNo,
  saleId: invoice.saleId,
  customerId: invoice.customerId ?? undefined,
  customerName: invoice.customerName,
  customerMobile: invoice.customerMobile,
  itemCode: invoice.itemCode,
  productName: invoice.productName,
  sku: invoice.sku,
  listPrice: moneyToNumber(invoice.listPrice),
  discount: moneyToNumber(invoice.discount),
  total: moneyToNumber(invoice.total),
  paymentMode: invoice.paymentMode as Invoice["paymentMode"],
  paymentRef: invoice.paymentRef ?? undefined,
  status: invoice.status as Invoice["status"],
  createdAt: invoice.createdAt.toISOString(),
});
