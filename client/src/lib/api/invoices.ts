import type { Invoice } from "@/lib/types";
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

  const url = URL.createObjectURL(data);
  const opened = window.open(url, "_blank");

  if (!opened) {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename ?? `invoice-${invoiceId}.pdf`;
    link.click();
  }

  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
};
