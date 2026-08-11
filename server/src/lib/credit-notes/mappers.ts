import type {
  CreditNote as PrismaCreditNote,
  CreditNoteItem as PrismaCreditNoteItem,
} from "@prisma/client";
import type { CreditNote, CreditNoteItem } from "../../types.js";
import { moneyToNumber } from "../money.js";

const toCreditNoteItem = (item: PrismaCreditNoteItem): CreditNoteItem => ({
  id: item.id,
  invoiceItemId: item.invoiceItemId,
  itemCode: item.itemCode,
  productName: item.productName,
  sku: item.sku,
  hsnCode: item.hsnCode ?? undefined,
  metal: item.metal,
  listPrice: moneyToNumber(item.listPrice),
  discount: moneyToNumber(item.discount),
  amount: moneyToNumber(item.amount),
  returnStock: item.returnStock,
});

export const toCreditNote = (
  note: PrismaCreditNote & {
    items: PrismaCreditNoteItem[];
    invoice?: { invoiceNo: string; total: { toString(): string } };
  },
): CreditNote => ({
  id: note.id,
  organizationId: note.organizationId,
  branchId: note.branchId,
  creditNoteNo: note.creditNoteNo,
  invoiceId: note.invoiceId,
  invoiceNo: note.invoice?.invoiceNo,
  customerId: note.customerId ?? undefined,
  customerName: note.customerName,
  customerMobile: note.customerMobile,
  reason: note.reason,
  reasonText: note.reasonText ?? undefined,
  subtotal: moneyToNumber(note.subtotal),
  discount: moneyToNumber(note.discount),
  taxableValue: moneyToNumber(note.taxableValue),
  cgst: moneyToNumber(note.cgst),
  sgst: moneyToNumber(note.sgst),
  igst: moneyToNumber(note.igst),
  roundOff: moneyToNumber(note.roundOff),
  total: moneyToNumber(note.total),
  refundMode: note.refundMode,
  refundRef: note.refundRef ?? undefined,
  status: note.status,
  placeOfSupply: note.placeOfSupply ?? undefined,
  createdByName: note.createdByName,
  createdAt: note.createdAt.toISOString(),
  items: note.items.map(toCreditNoteItem),
  invoiceTotal: note.invoice ? moneyToNumber(note.invoice.total.toString()) : undefined,
});
