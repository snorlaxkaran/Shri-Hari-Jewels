import type {
  CreditNote,
  CreditNoteRefundMode,
  CreditNoteReason,
  NewCreditNoteInput,
} from "@/lib/types";
import { api } from "./client";

export type CreditNoteMeta = {
  reasons: Array<{ value: CreditNoteReason; label: string }>;
  refundModes: Array<{ value: CreditNoteRefundMode; label: string }>;
};

export type InvoiceCreditSummary = {
  invoiceTotal: number;
  creditedTotal: number;
  remainingCreditable: number;
  remainingByItem: Record<string, number>;
};

export const fetchCreditNoteMeta = async (): Promise<CreditNoteMeta> => {
  const { data } = await api.get<CreditNoteMeta>("/api/credit-notes/meta");
  return data;
};

export const fetchCreditNotes = async (): Promise<CreditNote[]> => {
  const { data } = await api.get<CreditNote[]>("/api/credit-notes");
  return data;
};

export const fetchCreditNoteById = async (id: string): Promise<CreditNote> => {
  const { data } = await api.get<CreditNote>(`/api/credit-notes/${id}`);
  return data;
};

export const fetchCreditNotesForInvoice = async (
  invoiceId: string,
): Promise<CreditNote[]> => {
  const { data } = await api.get<CreditNote[]>(`/api/credit-notes/invoice/${invoiceId}`);
  return data;
};

export const fetchInvoiceCreditSummary = async (
  invoiceId: string,
): Promise<InvoiceCreditSummary> => {
  const { data } = await api.get<InvoiceCreditSummary>(
    `/api/credit-notes/invoice/${invoiceId}/summary`,
  );
  return data;
};

export const issueCreditNote = async (
  input: NewCreditNoteInput,
): Promise<CreditNote> => {
  const { data } = await api.post<CreditNote>("/api/credit-notes", input);
  return data;
};

export const fetchCreditNotePdfBlob = async (id: string): Promise<Blob> => {
  const { data } = await api.get<Blob>(`/api/credit-notes/${id}/pdf`, {
    responseType: "blob",
  });
  return data;
};
