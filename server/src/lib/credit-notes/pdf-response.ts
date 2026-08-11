import type { Response } from "express";
import { prisma } from "../db.js";
import { getCustomer } from "../customers/service.js";
import { getEInvoiceRecordForCreditNote } from "../einvoice/credit-note-service.js";
import { getShopSettings } from "../settings/service.js";
import { getCreditNote } from "./service.js";
import { toCreditNote } from "./mappers.js";
import { generateCreditNotePdf } from "./pdf.js";

export const sendCreditNotePdfResponse = async (
  creditNoteId: string,
  organizationId: string,
  res: Response,
): Promise<boolean> => {
  const row = await prisma.creditNote.findFirst({
    where: { id: creditNoteId, organizationId },
    include: {
      items: true,
      invoice: { select: { invoiceNo: true, total: true } },
    },
  });
  if (!row) return false;

  const creditNote = toCreditNote(row);
  const settings = await getShopSettings(organizationId);
  const customerBilling = creditNote.customerId
    ? await getCustomer(creditNote.customerId, organizationId)
    : null;
  const eInvoiceRecord = await getEInvoiceRecordForCreditNote(
    organizationId,
    creditNote.id,
  );

  const pdf = await generateCreditNotePdf(
    creditNote,
    settings,
    customerBilling,
    row.invoice.invoiceNo,
    {
      irn: eInvoiceRecord?.irn,
      ackNo: eInvoiceRecord?.ackNo,
    },
  );

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${creditNote.creditNoteNo}.pdf"`,
  );
  res.send(pdf);
  return true;
};

export const sendDebitNotePdfResponse = async (
  debitNoteId: string,
  organizationId: string,
  res: Response,
): Promise<boolean> => {
  const { getDebitNote } = await import("../debit-notes/service.js");
  const { generateDebitNotePdf } = await import("./pdf.js");
  const debitNote = await getDebitNote(debitNoteId, organizationId);
  if (!debitNote) return false;

  const settings = await getShopSettings(organizationId);
  const pdf = await generateDebitNotePdf(debitNote, settings);

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${debitNote.debitNoteNo}.pdf"`,
  );
  res.send(pdf);
  return true;
};
