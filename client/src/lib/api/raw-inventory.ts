import type {
  AdjustCertifiedStoneLotInput,
  AdjustMetalLotInput,
  CertifiedStoneLot,
  MetalLot,
  NewCertifiedStoneLotInput,
  NewMetalLotInput,
  RawInventorySummary,
  RawStockAuditLog,
  TransferCertifiedStoneLotInput,
  TransferMetalLotInput,
  UpdateCertifiedStoneLotInput,
  UpdateMetalLotInput,
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

export const fetchCertifiedStoneLots = async (): Promise<CertifiedStoneLot[]> => {
  const { data } = await api.get<CertifiedStoneLot[]>(
    "/api/raw-inventory/certified-stones",
  );
  return data;
};

export const createCertifiedStoneLot = async (
  input: NewCertifiedStoneLotInput,
): Promise<CertifiedStoneLot> => {
  const { data } = await api.post<CertifiedStoneLot>(
    "/api/raw-inventory/certified-stones",
    input,
  );
  return data;
};

export const updateCertifiedStoneLot = async (
  id: string,
  input: UpdateCertifiedStoneLotInput,
): Promise<CertifiedStoneLot> => {
  const { data } = await api.patch<CertifiedStoneLot>(
    `/api/raw-inventory/certified-stones/${id}`,
    input,
  );
  return data;
};

export const transferCertifiedStoneLot = async (
  id: string,
  input: TransferCertifiedStoneLotInput,
): Promise<CertifiedStoneLot> => {
  const { data } = await api.post<CertifiedStoneLot>(
    `/api/raw-inventory/certified-stones/${id}/transfer`,
    input,
  );
  return data;
};

export const adjustCertifiedStoneLot = async (
  id: string,
  input: AdjustCertifiedStoneLotInput,
): Promise<CertifiedStoneLot> => {
  const { data } = await api.post<CertifiedStoneLot>(
    `/api/raw-inventory/certified-stones/${id}/adjust`,
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
