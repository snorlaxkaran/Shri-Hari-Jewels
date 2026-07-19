import { API_BASE_URL, api } from "./client";

export type EInvoiceStatus =
  | "Pending"
  | "Generated"
  | "Failed"
  | "Skipped"
  | "Cancelled";

export type EInvoiceRecord = {
  id: string;
  organizationId: string;
  invoiceId: string | null;
  saleId: string | null;
  irn: string | null;
  ackNo: string | null;
  ackDate: string | null;
  qrCodeData: string | null;
  status: EInvoiceStatus;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
};

export type EInvoiceCancelReason = "1" | "2" | "3" | "4";

export const fetchEInvoiceForInvoice = async (
  invoiceId: string,
): Promise<EInvoiceRecord | null> => {
  const { data } = await api.get<{ record: EInvoiceRecord | null }>(
    `/api/einvoice/invoice/${invoiceId}`,
  );
  return data.record;
};

export const generateEInvoice = async (input: {
  invoiceId: string;
  saleId?: string;
  force?: boolean;
}): Promise<EInvoiceRecord> => {
  const { data } = await api.post<{ record: EInvoiceRecord }>(
    "/api/einvoice/generate",
    input,
  );
  return data.record;
};

export const cancelEInvoice = async (input: {
  recordId: string;
  reason: EInvoiceCancelReason;
  remarks?: string;
}): Promise<EInvoiceRecord> => {
  const { data } = await api.post<{ record: EInvoiceRecord }>(
    `/api/einvoice/records/${input.recordId}/cancel`,
    {
      reason: input.reason,
      remarks: input.remarks,
    },
  );
  return data.record;
};

export const getEInvoiceQrImageUrl = (recordId: string): string =>
  `${API_BASE_URL}/api/einvoice/records/${recordId}/qr.png`;

export const EINVOICE_CANCEL_REASONS: Array<{
  value: EInvoiceCancelReason;
  label: string;
}> = [
  { value: "1", label: "Duplicate" },
  { value: "2", label: "Data entry mistake" },
  { value: "3", label: "Order cancelled" },
  { value: "4", label: "Others" },
];
