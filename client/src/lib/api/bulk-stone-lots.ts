import type {
  BulkStoneLot,
  NewBulkStoneLotInput,
  UpdateBulkStoneLotInput,
} from "@/lib/types";
import { api } from "./client";

export const fetchBulkStoneLots = async (): Promise<BulkStoneLot[]> => {
  const { data } = await api.get<BulkStoneLot[]>("/api/bulk-stone-lots");
  return data;
};

export const createBulkStoneLot = async (
  input: NewBulkStoneLotInput,
): Promise<BulkStoneLot> => {
  const { data } = await api.post<BulkStoneLot>("/api/bulk-stone-lots", input);
  return data;
};

export const updateBulkStoneLot = async (
  id: string,
  input: UpdateBulkStoneLotInput,
): Promise<BulkStoneLot> => {
  const { data } = await api.patch<BulkStoneLot>(
    `/api/bulk-stone-lots/${id}`,
    input,
  );
  return data;
};

export const deleteBulkStoneLot = async (id: string): Promise<void> => {
  await api.delete(`/api/bulk-stone-lots/${id}`);
};
