import type { Invoice } from "@/lib/types";
import { openPdfBlob } from "@/lib/open-pdf";
import { API_BASE_URL, api } from "./client";

export const fetchInvoices = async (): Promise<Invoice[]> => {
  const { data } = await api.get<Invoice[]>("/api/invoices");
  return data;
};

/** @deprecated Use openInvoicePdf — direct URLs cannot send the auth token. */
export const getInvoicePdfUrl = (invoiceId: string) =>
  `${API_BASE_URL}/api/invoices/${invoiceId}/pdf`;

export const openInvoicePdf = async (
  invoiceId: string,
  filename?: string,
): Promise<void> => {
  const { data } = await api.get<Blob>(`/api/invoices/${invoiceId}/pdf`, {
    responseType: "blob",
  });
  openPdfBlob(data, filename ?? `Invoice ${invoiceId}`);
};
