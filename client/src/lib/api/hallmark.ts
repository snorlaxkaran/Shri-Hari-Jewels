import type {
  CreateHallmarkBatchInput,
  HallmarkBatchDetail,
  HallmarkBatchSummary,
  ReceiveHallmarkBatchInput,
} from "@/lib/types";
import { api } from "./client";

export const fetchHallmarkPendingCount = async (): Promise<number> => {
  const { data } = await api.get<{ count: number }>(
    "/api/hallmark-batches/pending-count",
  );
  return data.count;
};

export const fetchHallmarkBatches = async (): Promise<HallmarkBatchSummary[]> => {
  const { data } = await api.get<HallmarkBatchSummary[]>("/api/hallmark-batches");
  return data;
};

export const fetchHallmarkBatch = async (
  id: string,
): Promise<HallmarkBatchDetail> => {
  const { data } = await api.get<HallmarkBatchDetail>(
    `/api/hallmark-batches/${id}`,
  );
  return data;
};

export const createHallmarkBatch = async (
  input: CreateHallmarkBatchInput,
): Promise<HallmarkBatchDetail> => {
  const { data } = await api.post<HallmarkBatchDetail>(
    "/api/hallmark-batches",
    input,
  );
  return data;
};

export const sendHallmarkBatch = async (
  id: string,
): Promise<HallmarkBatchDetail> => {
  const { data } = await api.post<HallmarkBatchDetail>(
    `/api/hallmark-batches/${id}/send`,
  );
  return data;
};

export const receiveHallmarkBatch = async (
  id: string,
  input: ReceiveHallmarkBatchInput,
): Promise<HallmarkBatchDetail> => {
  const { data } = await api.post<HallmarkBatchDetail>(
    `/api/hallmark-batches/${id}/receive`,
    input,
  );
  return data;
};
