import { api } from "./client";
import type {
  AdjustStonePurchaseLotInput,
  IssueStoneInput,
  NewStonePurchaseLotInput,
  SettleStoneIssueInput,
  StoneLotDetail,
  StonePurchaseLotSummaryCards,
  StonePurchaseLotWithMaster,
  StoneMovementRecord,
  UnsettledStoneIssue,
} from "@/lib/types";

export const fetchStoneLots = async (params?: {
  status?: string;
  search?: string;
}): Promise<StonePurchaseLotWithMaster[]> => {
  const { data } = await api.get<StonePurchaseLotWithMaster[]>("/api/stone-lots", {
    params,
  });
  return data;
};

export const fetchStoneLotDetail = async (id: string): Promise<StoneLotDetail> => {
  const { data } = await api.get<StoneLotDetail>(`/api/stone-lots/${id}`);
  return data;
};

export const fetchStoneLotsSummary =
  async (): Promise<StonePurchaseLotSummaryCards> => {
    const { data } = await api.get<StonePurchaseLotSummaryCards>(
      "/api/stone-lots/summary",
    );
    return data;
  };

export const receiveStoneLot = async (
  input: NewStonePurchaseLotInput,
): Promise<StonePurchaseLotWithMaster> => {
  const { data } = await api.post<StonePurchaseLotWithMaster>(
    "/api/stone-lots",
    input,
  );
  return data;
};

export const adjustStoneLot = async (
  id: string,
  input: AdjustStonePurchaseLotInput,
): Promise<StoneLotDetail> => {
  const { data } = await api.post<StoneLotDetail>(
    `/api/stone-lots/${id}/adjust`,
    input,
  );
  return data;
};

export const fetchStoneLotLedger = async (
  id: string,
): Promise<StoneMovementRecord[]> => {
  const { data } = await api.get<StoneMovementRecord[]>(
    `/api/stone-lots/${id}/ledger`,
  );
  return data;
};

export const issueStones = async (
  lotId: string,
  input: IssueStoneInput,
): Promise<UnsettledStoneIssue> => {
  const { data } = await api.post<UnsettledStoneIssue>(
    `/api/stone-lots/${lotId}/issue`,
    input,
  );
  return data;
};

export const settleStoneIssue = async (
  issueId: string,
  input: SettleStoneIssueInput,
): Promise<UnsettledStoneIssue> => {
  const { data } = await api.post<UnsettledStoneIssue>(
    `/api/stone-lots/issues/${issueId}/settle`,
    input,
  );
  return data;
};

export const fetchUnsettledStoneIssues = async (): Promise<UnsettledStoneIssue[]> => {
  const { data } = await api.get<UnsettledStoneIssue[]>(
    "/api/stone-lots/issues/unsettled",
  );
  return data;
};
