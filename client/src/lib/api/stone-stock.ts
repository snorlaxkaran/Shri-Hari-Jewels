import { api } from "./client";
import type {
  AdjustStoneStockInput,
  IssueStoneInput,
  NewStoneStockInput,
  SettleStoneIssueInput,
  StoneStock,
  StoneStockDetail,
  StoneStockMovementRecord,
  StoneStockSummaryCards,
  UnsettledStoneIssue,
} from "@/lib/types";

export const fetchStoneStock = async (params?: {
  status?: string;
  search?: string;
}): Promise<StoneStock[]> => {
  const { data } = await api.get<StoneStock[]>("/api/stone-stock", { params });
  return data;
};

export const fetchStoneStockDetail = async (id: string): Promise<StoneStockDetail> => {
  const { data } = await api.get<StoneStockDetail>(`/api/stone-stock/${id}`);
  return data;
};

export const fetchStoneStockSummary =
  async (): Promise<StoneStockSummaryCards> => {
    const { data } = await api.get<StoneStockSummaryCards>(
      "/api/stone-stock/summary",
    );
    return data;
  };

export const createStoneStock = async (
  input: NewStoneStockInput,
): Promise<StoneStock> => {
  const { data } = await api.post<StoneStock>("/api/stone-stock", input);
  return data;
};

export const adjustStoneStock = async (
  id: string,
  input: AdjustStoneStockInput,
): Promise<StoneStockDetail> => {
  const { data } = await api.post<StoneStockDetail>(
    `/api/stone-stock/${id}/adjust`,
    input,
  );
  return data;
};

export const fetchStoneStockLedger = async (
  id: string,
): Promise<StoneStockMovementRecord[]> => {
  const { data } = await api.get<StoneStockMovementRecord[]>(
    `/api/stone-stock/${id}/ledger`,
  );
  return data;
};

export const issueStones = async (
  stockId: string,
  input: IssueStoneInput,
): Promise<UnsettledStoneIssue> => {
  const { data } = await api.post<UnsettledStoneIssue>(
    `/api/stone-stock/${stockId}/issue`,
    input,
  );
  return data;
};

export const settleStoneIssue = async (
  issueId: string,
  input: SettleStoneIssueInput,
): Promise<UnsettledStoneIssue> => {
  const { data } = await api.post<UnsettledStoneIssue>(
    `/api/stone-stock/issues/${issueId}/settle`,
    input,
  );
  return data;
};

export const fetchUnsettledStoneIssues = async (): Promise<UnsettledStoneIssue[]> => {
  const { data } = await api.get<UnsettledStoneIssue[]>(
    "/api/stone-stock/issues/unsettled",
  );
  return data;
};
