import { api } from "./client";
import type { StockAuditMetalGroup, StockAuditSession } from "@/lib/types";

export const fetchStockAuditSessions = async (
  metalGroup: StockAuditMetalGroup,
): Promise<StockAuditSession[]> => {
  const { data } = await api.get<StockAuditSession[]>("/stock-audit/sessions", {
    params: { metalGroup },
  });
  return data;
};

export const createStockAuditSession = async (
  metalGroup: StockAuditMetalGroup,
): Promise<StockAuditSession> => {
  const { data } = await api.post<StockAuditSession>("/stock-audit/sessions", {
    metalGroup,
  });
  return data;
};

export const fetchStockAuditSession = async (
  sessionId: string,
): Promise<StockAuditSession> => {
  const { data } = await api.get<StockAuditSession>(
    `/stock-audit/sessions/${sessionId}`,
  );
  return data;
};

export const scanStockAuditItem = async (
  sessionId: string,
  itemCode: string,
): Promise<StockAuditSession> => {
  const { data } = await api.post<StockAuditSession>(
    `/stock-audit/sessions/${sessionId}/scan`,
    { itemCode },
  );
  return data;
};

export const closeStockAuditSession = async (
  sessionId: string,
): Promise<StockAuditSession> => {
  const { data } = await api.post<StockAuditSession>(
    `/stock-audit/sessions/${sessionId}/close`,
  );
  return data;
};
