import { prisma } from "../db.js";
import { getCustomer } from "../customers/service.js";
import { getCreditNote } from "../credit-notes/service.js";
import { getShopSettings } from "../settings/service.js";
import { mapCreditNoteToCrn } from "./crn-mapper.js";
import { requireEinvoiceConfig } from "./config.js";
import { generateNicIrn } from "./nic-client.js";
import { EinvoiceError } from "./errors.js";
import type { EInvoiceRecordDto } from "./service.js";

const toRecordDto = (record: {
  id: string;
  organizationId: string;
  invoiceId: string | null;
  saleId: string | null;
  creditNoteId: string | null;
  irn: string | null;
  ackNo: string | null;
  ackDate: Date | null;
  qrCodeData: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}): EInvoiceRecordDto => ({
  id: record.id,
  organizationId: record.organizationId,
  invoiceId: record.invoiceId,
  saleId: record.saleId,
  irn: record.irn,
  ackNo: record.ackNo,
  ackDate: record.ackDate?.toISOString() ?? null,
  qrCodeData: record.qrCodeData,
  status: record.status,
  errorMessage: record.errorMessage,
  createdAt: record.createdAt.toISOString(),
  updatedAt: record.updatedAt.toISOString(),
});

export const getEInvoiceRecordForCreditNote = async (
  organizationId: string,
  creditNoteId: string,
): Promise<EInvoiceRecordDto | null> => {
  const row = await prisma.eInvoiceRecord.findFirst({
    where: { organizationId, creditNoteId },
    orderBy: { createdAt: "desc" },
  });
  return row ? toRecordDto(row) : null;
};

export const generateCreditNoteEInvoice = async (input: {
  organizationId: string;
  creditNoteId: string;
}): Promise<EInvoiceRecordDto | null> => {
  const creditNote = await getCreditNote(input.creditNoteId, input.organizationId);
  if (!creditNote) {
    throw new EinvoiceError("Credit note not found.", "CREDIT_NOTE_NOT_FOUND");
  }

  const originalEInvoice = await prisma.eInvoiceRecord.findFirst({
    where: {
      organizationId: input.organizationId,
      invoiceId: creditNote.invoiceId,
      status: "Generated",
      irn: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });

  if (!originalEInvoice?.irn) {
    return null;
  }

  const existing = await prisma.eInvoiceRecord.findFirst({
    where: {
      organizationId: input.organizationId,
      creditNoteId: input.creditNoteId,
      status: { in: ["Generated", "Pending"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.status === "Generated" && existing.irn) {
    return toRecordDto(existing);
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: creditNote.invoiceId },
    select: { invoiceNo: true, createdAt: true },
  });
  if (!invoice) {
    throw new EinvoiceError("Original invoice not found.", "INVOICE_NOT_FOUND");
  }

  const settings = await getShopSettings(input.organizationId);
  const customer = creditNote.customerId
    ? await getCustomer(creditNote.customerId, input.organizationId)
    : null;

  const pendingRecord = await prisma.eInvoiceRecord.create({
    data: {
      organizationId: input.organizationId,
      creditNoteId: input.creditNoteId,
      invoiceId: creditNote.invoiceId,
      status: "Pending",
    },
  });

  try {
    const config = requireEinvoiceConfig();
    const payload = mapCreditNoteToCrn({
      creditNote,
      originalInvoiceNo: invoice.invoiceNo,
      originalInvoiceDate: invoice.createdAt.toISOString(),
      originalIrn: originalEInvoice.irn,
      settings,
      customer,
    });
    const result = await generateNicIrn(config, payload);

    const updated = await prisma.eInvoiceRecord.update({
      where: { id: pendingRecord.id },
      data: {
        irn: result.irn,
        ackNo: result.ackNo,
        ackDate: result.ackDate,
        qrCodeData: result.signedQrCode,
        status: "Generated",
        errorMessage: null,
      },
    });
    return toRecordDto(updated);
  } catch (error) {
    const message =
      error instanceof EinvoiceError
        ? error.message
        : error instanceof Error
          ? error.message
          : "Unknown credit note e-Invoice error.";

    const updated = await prisma.eInvoiceRecord.update({
      where: { id: pendingRecord.id },
      data: {
        status: "Failed",
        errorMessage: message,
      },
    });
    return toRecordDto(updated);
  }
};
