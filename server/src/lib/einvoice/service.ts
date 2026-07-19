import { prisma } from "../db.js";
import { getCustomer } from "../customers/service.js";
import { getInvoice } from "../invoices/service.js";
import { getShopSettings } from "../settings/service.js";
import { mapInvoiceToInv1 } from "./inv1-mapper.js";
import {
  describeEinvoiceSkipReason,
  isEinvoiceEligible,
} from "./eligibility.js";
import {
  getEinvoiceConfig,
  isEinvoiceConfigured,
  requireEinvoiceConfig,
} from "./config.js";
import {
  cancelNicIrn,
  generateNicIrn,
  type NicCancelReason,
} from "./nic-client.js";
import {
  EinvoiceCancellationError,
  EinvoiceError,
} from "./errors.js";

const CANCELLATION_WINDOW_MS = 24 * 60 * 60 * 1000;

export const isWithinCancellationWindow = (
  ackDate: Date,
  now: Date = new Date(),
): boolean => {
  const elapsed = now.getTime() - ackDate.getTime();
  return elapsed >= 0 && elapsed <= CANCELLATION_WINDOW_MS;
};

export type EInvoiceRecordDto = {
  id: string;
  organizationId: string;
  invoiceId: string | null;
  saleId: string | null;
  irn: string | null;
  ackNo: string | null;
  ackDate: string | null;
  qrCodeData: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

const toRecordDto = (record: {
  id: string;
  organizationId: string;
  invoiceId: string | null;
  saleId: string | null;
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

export const listEInvoiceRecords = async (
  organizationId: string,
): Promise<EInvoiceRecordDto[]> => {
  const rows = await prisma.eInvoiceRecord.findMany({
    where: { organizationId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return rows.map(toRecordDto);
};

export const getEInvoiceRecordForInvoice = async (
  organizationId: string,
  invoiceId: string,
): Promise<EInvoiceRecordDto | null> => {
  const row = await prisma.eInvoiceRecord.findFirst({
    where: { organizationId, invoiceId },
    orderBy: { createdAt: "desc" },
  });
  return row ? toRecordDto(row) : null;
};

export const generateEInvoice = async (input: {
  organizationId: string;
  invoiceId: string;
  saleId?: string;
  force?: boolean;
}): Promise<EInvoiceRecordDto> => {
  const settings = await getShopSettings(input.organizationId);
  const invoice = await getInvoice(input.invoiceId, input.organizationId);
  if (!invoice) {
    throw new EinvoiceError("Invoice not found.", "INVOICE_NOT_FOUND");
  }

  const customer = invoice.customerId
    ? await getCustomer(invoice.customerId, input.organizationId)
    : null;

  const existing = await prisma.eInvoiceRecord.findFirst({
    where: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
      status: { in: ["Generated", "Pending"] },
    },
    orderBy: { createdAt: "desc" },
  });

  if (existing?.status === "Generated" && existing.irn && !input.force) {
    return toRecordDto(existing);
  }

  const skipReason = describeEinvoiceSkipReason({
    settings,
    buyerGstNumber: customer?.gstNumber,
  });

  if (skipReason && !input.force) {
    return toRecordDto(
      await prisma.eInvoiceRecord.create({
        data: {
          organizationId: input.organizationId,
          invoiceId: input.invoiceId,
          saleId: input.saleId,
          status: "Skipped",
          errorMessage: skipReason,
        },
      }),
    );
  }

  const pendingRecord = await prisma.eInvoiceRecord.create({
    data: {
      organizationId: input.organizationId,
      invoiceId: input.invoiceId,
      saleId: input.saleId,
      status: "Pending",
    },
  });

  try {
    const config = requireEinvoiceConfig();
    const payload = mapInvoiceToInv1({ invoice, settings, customer });
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
          : "Unknown e-Invoice generation error.";

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

export const cancelEInvoice = async (input: {
  organizationId: string;
  recordId: string;
  reason: NicCancelReason;
  remarks?: string;
}): Promise<EInvoiceRecordDto> => {
  if (!isEinvoiceConfigured()) {
    throw new EinvoiceError(
      "NIC e-Invoice integration is not configured.",
      "NOT_CONFIGURED",
    );
  }

  const record = await prisma.eInvoiceRecord.findFirst({
    where: { id: input.recordId, organizationId: input.organizationId },
  });
  if (!record) {
    throw new EinvoiceError("e-Invoice record not found.", "RECORD_NOT_FOUND");
  }
  if (record.status === "Cancelled") {
    return toRecordDto(record);
  }
  if (record.status !== "Generated" || !record.irn || !record.ackDate) {
    throw new EinvoiceError(
      "Only generated e-invoices with an IRN can be cancelled.",
      "NOT_GENERATED",
    );
  }

  if (!isWithinCancellationWindow(record.ackDate)) {
    throw new EinvoiceCancellationError(
      "This e-invoice can no longer be cancelled — the 24-hour IRP window has passed. Issue a credit note instead.",
    );
  }

  try {
    const config = requireEinvoiceConfig();
    await cancelNicIrn(config, {
      irn: record.irn,
      reason: input.reason,
      remarks: input.remarks,
    });

    const updated = await prisma.eInvoiceRecord.update({
      where: { id: record.id },
      data: {
        status: "Cancelled",
        errorMessage: input.remarks?.trim() || null,
      },
    });
    return toRecordDto(updated);
  } catch (error) {
    if (error instanceof EinvoiceError) throw error;
    throw new EinvoiceError(
      error instanceof Error ? error.message : "Cancellation failed.",
      "NIC_CANCEL_FAILED",
    );
  }
};

export const maybeAutoGenerateEInvoice = async (input: {
  organizationId: string;
  invoiceId: string;
  saleId?: string;
}): Promise<void> => {
  const settings = await getShopSettings(input.organizationId);
  const invoice = await getInvoice(input.invoiceId, input.organizationId);
  if (!invoice) return;

  const customer = invoice.customerId
    ? await getCustomer(invoice.customerId, input.organizationId)
    : null;

  if (
    !isEinvoiceEligible({
      settings,
      buyerGstNumber: customer?.gstNumber,
    })
  ) {
    return;
  }

  await generateEInvoice({
    organizationId: input.organizationId,
    invoiceId: input.invoiceId,
    saleId: input.saleId,
  });
};

export const getEinvoiceConfigStatus = (): {
  configured: boolean;
  gstin: string | null;
} => {
  const config = getEinvoiceConfig();
  return {
    configured: Boolean(config),
    gstin: config?.gstin ?? null,
  };
};
