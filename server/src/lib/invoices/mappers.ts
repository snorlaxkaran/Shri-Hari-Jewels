import type {
  Invoice as PrismaInvoice,
  InvoiceItem as PrismaInvoiceItem,
} from "@prisma/client";
import type { Invoice, InvoiceItem } from "../../types.js";
import { moneyToNumber } from "../money.js";

const toInvoiceItem = (item: PrismaInvoiceItem): InvoiceItem => ({
  id: item.id,
  saleId: item.saleId ?? undefined,
  itemCode: item.itemCode,
  productName: item.productName,
  sku: item.sku,
  hsnCode: item.hsnCode ?? undefined,
  metal: item.metal,
  listPrice: moneyToNumber(item.listPrice),
  discount: moneyToNumber(item.discount),
  amount: moneyToNumber(item.amount),
});

export const toInvoice = (
  invoice: PrismaInvoice & { items: PrismaInvoiceItem[] },
): Invoice => ({
  id: invoice.id,
  invoiceNo: invoice.invoiceNo,
  cartGroupId: invoice.cartGroupId ?? undefined,
  customerId: invoice.customerId ?? undefined,
  customerName: invoice.customerName,
  customerMobile: invoice.customerMobile,
  subtotal: moneyToNumber(invoice.subtotal),
  discount: moneyToNumber(invoice.discount),
  taxableValue: moneyToNumber(invoice.taxableValue),
  cgst: moneyToNumber(invoice.cgst),
  sgst: moneyToNumber(invoice.sgst),
  igst: moneyToNumber(invoice.igst),
  roundOff: moneyToNumber(invoice.roundOff),
  total: moneyToNumber(invoice.total),
  paymentMode: invoice.paymentMode as Invoice["paymentMode"],
  paymentRef: invoice.paymentRef ?? undefined,
  status: invoice.status as Invoice["status"],
  placeOfSupply: invoice.placeOfSupply ?? undefined,
  createdAt: invoice.createdAt.toISOString(),
  items: invoice.items.map(toInvoiceItem),
  itemCount: invoice.items.length,
});
