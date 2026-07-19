import type { Invoice } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import {
  downloadPdfBlob,
  openShareUrlInTab,
  openWhatsAppChat,
  sharePdfBlob,
} from "@/lib/open-pdf";
import { API_BASE_URL, api } from "./client";

export const fetchInvoices = async (): Promise<Invoice[]> => {
  const { data } = await api.get<Invoice[]>("/api/invoices");
  return data;
};

export type InvoiceShareLink = {
  token: string;
  expiresAt: string;
  invoiceNo: string;
  shareUrl: string;
};

export const buildInvoiceSharePageUrl = (token: string): string => {
  const encoded = encodeURIComponent(token);
  if (typeof window !== "undefined") {
    return `${window.location.origin}/i/${encoded}`;
  }
  return `/i/${encoded}`;
};

export const getInvoiceShareLink = async (
  invoiceId: string,
): Promise<InvoiceShareLink> => {
  const { data } = await api.get<{
    token: string;
    expiresAt: string;
    invoiceNo: string;
  }>(`/api/invoices/${invoiceId}/share-token`);
  return {
    ...data,
    shareUrl: buildInvoiceSharePageUrl(data.token),
  };
};

/** @deprecated Use getInvoiceShareLink — direct URLs cannot send the auth token. */
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
  _filename?: string,
  tab?: Window | null,
): Promise<string> => {
  const { shareUrl } = await getInvoiceShareLink(invoiceId);
  openShareUrlInTab(shareUrl, tab);
  return shareUrl;
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

export const buildInvoiceShareMessage = (
  invoice: InvoiceShareInput,
  shareUrl?: string,
): string => {
  const lines = [
    `Invoice ${invoice.invoiceNo} — ${invoice.customerName}`,
    `Amount: ${formatCurrency(invoice.total)}`,
  ];
  if (shareUrl) {
    lines.push("", shareUrl);
  } else {
    lines.push("", "Please find the invoice PDF attached.");
  }
  return lines.join("\n");
};

/** Share invoice link on WhatsApp, or PDF file when the share sheet is available. */
export const shareInvoicePdf = async (
  invoice: InvoiceShareInput,
): Promise<"shared" | "link" | "downloaded"> => {
  const { shareUrl } = await getInvoiceShareLink(invoice.id);
  const message = buildInvoiceShareMessage(invoice, shareUrl);
  const filename = `${invoice.invoiceNo}.pdf`;
  const blob = await fetchInvoicePdfBlob(invoice.id);

  try {
    const result = await sharePdfBlob(blob, filename, message);
    if (result === "shared") return "shared";
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw err;
    }
  }

  if (invoice.customerMobile.trim()) {
    openWhatsAppChat(invoice.customerMobile, message);
    return "link";
  }

  downloadPdfBlob(blob, filename);
  return "downloaded";
};
