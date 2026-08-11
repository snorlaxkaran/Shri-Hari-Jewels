import type { DebitNote, DebitNoteReason, NewDebitNoteInput } from "@/lib/types";
import { api } from "./client";

export type DebitNoteMeta = {
  reasons: Array<{ value: DebitNoteReason; label: string }>;
};

export const fetchDebitNoteMeta = async (): Promise<DebitNoteMeta> => {
  const { data } = await api.get<DebitNoteMeta>("/api/debit-notes/meta");
  return data;
};

export const fetchDebitNotes = async (): Promise<DebitNote[]> => {
  const { data } = await api.get<DebitNote[]>("/api/debit-notes");
  return data;
};

export const fetchDebitNoteById = async (id: string): Promise<DebitNote> => {
  const { data } = await api.get<DebitNote>(`/api/debit-notes/${id}`);
  return data;
};

export const fetchDebitNotesForBill = async (
  purchaseBillId: string,
): Promise<DebitNote[]> => {
  const { data } = await api.get<DebitNote[]>(
    `/api/debit-notes/bill/${purchaseBillId}`,
  );
  return data;
};

export const issueDebitNote = async (input: NewDebitNoteInput): Promise<DebitNote> => {
  const { data } = await api.post<DebitNote>("/api/debit-notes", input);
  return data;
};

export const fetchDebitNotePdfBlob = async (id: string): Promise<Blob> => {
  const { data } = await api.get<Blob>(`/api/debit-notes/${id}/pdf`, {
    responseType: "blob",
  });
  return data;
};
