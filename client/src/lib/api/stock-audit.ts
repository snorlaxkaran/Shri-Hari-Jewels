import { api } from "./client";
import type {
  StockAuditMetalGroup,
  StockAuditPendingItem,
  StockAuditSession,
} from "@/lib/types";

export const fetchStockAuditSessions = async (
  metalGroup?: StockAuditMetalGroup,
): Promise<StockAuditSession[]> => {
  const { data } = await api.get<StockAuditSession[]>("/api/stock-audit/sessions", {
    params: metalGroup ? { metalGroup } : undefined,
  });
  return data;
};

export const createStockAuditSession = async (
  metalGroup: StockAuditMetalGroup,
): Promise<StockAuditSession> => {
  const { data } = await api.post<StockAuditSession>("/api/stock-audit/sessions", {
    metalGroup,
  });
  return data;
};

export const fetchStockAuditSession = async (
  sessionId: string,
  options?: { includeScans?: boolean },
): Promise<StockAuditSession> => {
  const { data } = await api.get<StockAuditSession>(
    `/api/stock-audit/sessions/${sessionId}`,
    {
      params: options?.includeScans ? { includeScans: "true" } : undefined,
    },
  );
  return data;
};

export const fetchStockAuditPendingItems = async (
  sessionId: string,
): Promise<StockAuditPendingItem[]> => {
  const { data } = await api.get<StockAuditPendingItem[]>(
    `/api/stock-audit/sessions/${sessionId}/pending`,
  );
  return data;
};

export const scanStockAuditItem = async (
  sessionId: string,
  itemCode: string,
): Promise<StockAuditSession> => {
  const { data } = await api.post<StockAuditSession>(
    `/api/stock-audit/sessions/${sessionId}/scan`,
    { itemCode },
  );
  return data;
};

export const closeStockAuditSession = async (
  sessionId: string,
): Promise<StockAuditSession> => {
  const { data } = await api.post<StockAuditSession>(
    `/api/stock-audit/sessions/${sessionId}/close`,
  );
  return data;
};
