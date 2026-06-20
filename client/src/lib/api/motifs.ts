import type {
  Motif,
  NewMotifInput,
  UpdateMotifInput,
} from "@/lib/types";
import { api } from "./client";

export const fetchMotifs = async (): Promise<Motif[]> => {
  const { data } = await api.get<Motif[]>("/api/motifs");
  return data;
};

export const createMotif = async (input: NewMotifInput): Promise<Motif> => {
  const { data } = await api.post<Motif>("/api/motifs", input, {
    timeout: 60000,
  });
  return data;
};

export const createMotifsBulk = async (
  items: NewMotifInput[],
): Promise<{ created: Motif[]; errors: string[] }> => {
  const { data } = await api.post<{ created: Motif[]; errors: string[] }>(
    "/api/motifs/bulk",
    items,
  );
  return data;
};

export const updateMotif = async (
  id: string,
  input: UpdateMotifInput,
): Promise<Motif> => {
  const { data } = await api.patch<Motif>(`/api/motifs/${id}`, input, {
    timeout: 60000,
  });
  return data;
};

export const deleteMotif = async (id: string): Promise<void> => {
  await api.delete(`/api/motifs/${id}`);
};

export const fetchMotifPriceDrift = async (
  motifId: string,
): Promise<import("@/lib/types").MotifPriceDrift> => {
  const { data } = await api.get(`/api/motifs/${motifId}/price-drift`);
  return data;
};

export const recalculateMotifPrice = async (
  motifId: string,
): Promise<{ price: number }> => {
  const { data } = await api.post<{ price: number }>(
    `/api/motifs/${motifId}/recalculate-price`,
  );
  return data;
};
