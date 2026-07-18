import { api } from "./client";
import type { NewPurchaseBillInput, PurchaseBill } from "@/lib/types";

export const fetchPurchaseBills = async (): Promise<PurchaseBill[]> => {
  const { data } = await api.get<PurchaseBill[]>("/api/purchase-bills");
  return data;
};

export const createPurchaseBill = async (
  input: NewPurchaseBillInput,
): Promise<PurchaseBill> => {
  const { data } = await api.post<PurchaseBill>("/api/purchase-bills", input);
  return data;
};
