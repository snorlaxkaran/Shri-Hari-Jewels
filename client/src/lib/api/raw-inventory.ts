import type {
  AdjustMetalLotInput,
  AdjustStoneLotInput,
  MetalLot,
  NewMetalLotInput,
  NewStoneLotInput,
  RawInventorySummary,
  RawStockAuditLog,
  StoneLot,
  TransferMetalLotInput,
  TransferStoneLotInput,
  UpdateMetalLotInput,
  UpdateStoneLotInput,
} from "@/lib/types";
import { api } from "./client";

export const fetchRawInventorySummary = async (): Promise<RawInventorySummary> => {
  const { data } = await api.get<RawInventorySummary>("/api/raw-inventory/summary");
  return data;
};

export const fetchMetalLots = async (): Promise<MetalLot[]> => {
  const { data } = await api.get<MetalLot[]>("/api/raw-inventory/metal");
  return data;
};

export const createMetalLot = async (
  input: NewMetalLotInput,
): Promise<MetalLot> => {
  const { data } = await api.post<MetalLot>("/api/raw-inventory/metal", input);
  return data;
};

export const updateMetalLot = async (
  id: string,
  input: UpdateMetalLotInput,
): Promise<MetalLot> => {
  const { data } = await api.patch<MetalLot>(`/api/raw-inventory/metal/${id}`, input);
  return data;
};

export const transferMetalLot = async (
  id: string,
  input: TransferMetalLotInput,
): Promise<MetalLot> => {
  const { data } = await api.post<MetalLot>(
    `/api/raw-inventory/metal/${id}/transfer`,
    input,
  );
  return data;
};

export const adjustMetalLot = async (
  id: string,
  input: AdjustMetalLotInput,
): Promise<MetalLot> => {
  const { data } = await api.post<MetalLot>(
    `/api/raw-inventory/metal/${id}/adjust`,
    input,
  );
  return data;
};

export const fetchStoneLots = async (): Promise<StoneLot[]> => {
  const { data } = await api.get<StoneLot[]>("/api/raw-inventory/stones");
  return data;
};

export const createStoneLot = async (
  input: NewStoneLotInput,
): Promise<StoneLot> => {
  const { data } = await api.post<StoneLot>("/api/raw-inventory/stones", input);
  return data;
};

export const updateStoneLot = async (
  id: string,
  input: UpdateStoneLotInput,
): Promise<StoneLot> => {
  const { data } = await api.patch<StoneLot>(`/api/raw-inventory/stones/${id}`, input);
  return data;
};

export const transferStoneLot = async (
  id: string,
  input: TransferStoneLotInput,
): Promise<StoneLot> => {
  const { data } = await api.post<StoneLot>(
    `/api/raw-inventory/stones/${id}/transfer`,
    input,
  );
  return data;
};

export const adjustStoneLot = async (
  id: string,
  input: AdjustStoneLotInput,
): Promise<StoneLot> => {
  const { data } = await api.post<StoneLot>(
    `/api/raw-inventory/stones/${id}/adjust`,
    input,
  );
  return data;
};

export const fetchRawStockAuditLogs = async (
  stockType?: "Metal" | "Stone",
  stockId?: string,
): Promise<RawStockAuditLog[]> => {
  const { data } = await api.get<RawStockAuditLog[]>("/api/raw-inventory/audit", {
    params: { stockType, stockId },
  });
  return data;
};
