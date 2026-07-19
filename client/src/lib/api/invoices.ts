import type { Invoice } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import {
  downloadPdfBlob,
  openPdfBlob,
  openWhatsAppChat,
  sharePdfBlob,
} from "@/lib/open-pdf";
import { API_BASE_URL, api } from "./client";

export const fetchInvoices = async (): Promise<Invoice[]> => {
  const { data } = await api.get<Invoice[]>("/api/invoices");
  return data;
};

/** @deprecated Use openInvoicePdf — direct URLs cannot send the auth token. */
export const getInvoicePdfUrl = (invoiceId: string) =>
  `${API_BASE_URL}/api/invoices/${invoiceId}/pdf`;

export const fetchInvoicePdfBlob = async (invoiceId: string): Promise<Blob> => {
  const { data } = await api.get<Blob>(`/api/invoices/${invoiceId}/pdf`, {
    responseType: "blob",
  });
  return data;
};

export const openInvoicePdf = async (
  invoiceId: string,
  filename?: string,
  tab?: Window | null,
): Promise<void> => {
  const data = await fetchInvoicePdfBlob(invoiceId);
  openPdfBlob(data, filename ?? `Invoice ${invoiceId}`, tab);
};

export const downloadInvoicePdf = async (
  invoiceId: string,
  filename: string,
): Promise<void> => {
  const data = await fetchInvoicePdfBlob(invoiceId);
  downloadPdfBlob(data, filename);
};

export type InvoiceShareInput = Pick<
  Invoice,
  "id" | "invoiceNo" | "customerName" | "customerMobile" | "total"
>;

export const buildInvoiceShareMessage = (invoice: InvoiceShareInput): string => {
  return `Invoice ${invoice.invoiceNo} — ${invoice.customerName}\nAmount: ${formatCurrency(invoice.total)}\n\nPlease find the invoice PDF attached.`;
};

/** Share or download invoice PDF for WhatsApp (blob URLs are not shareable). */
export const shareInvoicePdf = async (
  invoice: InvoiceShareInput,
): Promise<"shared" | "downloaded"> => {
  const filename = `${invoice.invoiceNo}.pdf`;
  const message = buildInvoiceShareMessage(invoice);
  const blob = await fetchInvoicePdfBlob(invoice.id);

  try {
    const result = await sharePdfBlob(blob, filename, message);
    if (result === "downloaded" && invoice.customerMobile.trim()) {
      openWhatsAppChat(
        invoice.customerMobile,
        `${message}\n\nAttach the downloaded PDF from your device.`,
      );
    }
    return result;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
    downloadPdfBlob(blob, filename);
    if (invoice.customerMobile.trim()) {
      openWhatsAppChat(
        invoice.customerMobile,
        `${message}\n\nAttach the downloaded PDF from your device.`,
      );
    }
    return "downloaded";
  }
};
