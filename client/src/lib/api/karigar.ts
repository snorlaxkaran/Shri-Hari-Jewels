import type { KarigarSettlement } from "@/lib/types";
import { api } from "./client";

export const fetchKarigarSettlements = async (filters?: {
  status?: "Open" | "Settled";
  karigarName?: string;
  fromDate?: string;
  toDate?: string;
}): Promise<KarigarSettlement[]> => {
  const { data } = await api.get<{ items: KarigarSettlement[] }>(
    "/api/karigar/settlements",
    { params: filters },
  );
  return data.items;
};

export const generateKarigarSettlements = async (
  productionRunId: string,
): Promise<Array<{ id: string; karigarName: string }>> => {
  const { data } = await api.post<{ created: Array<{ id: string; karigarName: string }> }>(
    "/api/karigar/settlements/generate",
    { productionRunId },
  );
  return data.created;
};

export const createKarigarSettlement = async (input: {
  productionRunId?: string;
  karigarName: string;
  metalIssuedGrams: number;
  metalReturnedGrams: number;
  wastageCost?: number;
  makingChargeWage: number;
  notes?: string;
}): Promise<{ id: string }> => {
  const { data } = await api.post<{ id: string }>("/api/karigar/settlements", input);
  return data;
};

export const settleKarigarSettlement = async (id: string): Promise<void> => {
  await api.post(`/api/karigar/settlements/${id}/settle`, {});
};
