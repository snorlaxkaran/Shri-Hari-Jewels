import type {
  CompleteProductionRunStageInput,
  NewProductionRunInput,
  ProductionRun,
  ProductionRunPreview,
  ProductionRunStage,
  UpdateProductionRunInput,
  UpdateProductionRunItemInput,
} from "@/lib/types";
import {
  normalizeProductionRun,
  normalizeProductionRunList,
  normalizeProductionRunStage,
} from "@/lib/production-runs/normalize-run";
import { api } from "./client";

export const fetchProductionRuns = async (): Promise<ProductionRun[]> => {
  const { data } = await api.get<ProductionRun[]>("/api/production-runs");
  return normalizeProductionRunList(data);
};

export const fetchProductionRun = async (id: string): Promise<ProductionRun> => {
  const { data } = await api.get<ProductionRun>(`/api/production-runs/${id}`);
  return normalizeProductionRun(data);
};

export const reserveProductionRunMetal = async (
  id: string,
): Promise<ProductionRun> => {
  const { data } = await api.post<ProductionRun>(
    `/api/production-runs/${id}/reserve-metal`,
    {},
  );
  return normalizeProductionRun(data);
};

export const fetchProductionRunPreview = async (
  designId: string,
  setsOrdered: number,
): Promise<ProductionRunPreview> => {
  const { data } = await api.get<ProductionRunPreview>(
    "/api/production-runs/preview",
    { params: { designId, setsOrdered } },
  );
  return data;
};

export const downloadProductionRunStagePdf = async (
  runId: string,
  runNo: string,
  stageSlug: string,
): Promise<void> => {
  const { data } = await api.get<ArrayBuffer>(
    `/api/production-runs/${runId}/stages/${stageSlug}/pdf`,
    { responseType: "arraybuffer" },
  );
  const blob = new Blob([data], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${runNo}-${stageSlug}.pdf`;
  link.click();
  URL.revokeObjectURL(url);
};

export const createProductionRun = async (
  input: NewProductionRunInput,
): Promise<ProductionRun> => {
  const { data } = await api.post<ProductionRun>(
    "/api/production-runs",
    input,
  );
  return normalizeProductionRun(data);
};

export const updateProductionRun = async (
  id: string,
  input: UpdateProductionRunInput,
): Promise<ProductionRun> => {
  const { data } = await api.patch<ProductionRun>(
    `/api/production-runs/${id}`,
    input,
  );
  return normalizeProductionRun(data);
};

export const fetchFinishedGoodsDefaults = async (
  runId: string,
): Promise<import("@/lib/types").FinishedGoodsDefaults> => {
  const { data } = await api.get(`/api/production-runs/${runId}/finished-goods-defaults`);
  return data;
};

export const updateProductionRunItem = async (
  runId: string,
  itemId: string,
  input: UpdateProductionRunItemInput,
): Promise<ProductionRun> => {
  const { data } = await api.patch<ProductionRun>(
    `/api/production-runs/${runId}/items/${itemId}`,
    input,
  );
  return normalizeProductionRun(data);
};

export const deleteProductionRun = async (id: string): Promise<void> => {
  await api.delete(`/api/production-runs/${id}`);
};

export const exportProductionRunCsv = async (
  id: string,
  runNo: string,
): Promise<void> => {
  const { data } = await api.get<string>(`/api/production-runs/${id}/export`, {
    responseType: "text",
  });
  const blob = new Blob([data], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${runNo}.csv`;
  link.click();
  URL.revokeObjectURL(url);
};

export const completeProductionRunStage = async (
  runId: string,
  stageSlug: string,
  input: CompleteProductionRunStageInput,
): Promise<{ currentStage: ProductionRunStage; stageLogs: import("@/lib/types").ProductionRunStageLog[] }> => {
  const { data } = await api.post(
    `/api/production-runs/${runId}/stages/${stageSlug}/complete`,
    input,
  );
  return {
    ...data,
    currentStage: normalizeProductionRunStage(data.currentStage),
    stageLogs: data.stageLogs.map((log: import("@/lib/types").ProductionRunStageLog) => ({
      ...log,
      action: log.action ?? "Completed",
      stage: normalizeProductionRunStage(log.stage),
      rejectedToStage: log.rejectedToStage
        ? normalizeProductionRunStage(log.rejectedToStage)
        : undefined,
    })),
  };
};

export const rejectProductionRunStage = async (
  runId: string,
  stageSlug: string,
  input: import("@/lib/types").RejectProductionRunStageInput,
): Promise<{ currentStage: ProductionRunStage; stageLogs: import("@/lib/types").ProductionRunStageLog[] }> => {
  const { data } = await api.post(
    `/api/production-runs/${runId}/stages/${stageSlug}/reject`,
    input,
  );
  return {
    ...data,
    currentStage: normalizeProductionRunStage(data.currentStage),
    stageLogs: data.stageLogs.map((log: import("@/lib/types").ProductionRunStageLog) => ({
      ...log,
      action: log.action ?? "Completed",
      stage: normalizeProductionRunStage(log.stage),
      rejectedToStage: log.rejectedToStage
        ? normalizeProductionRunStage(log.rejectedToStage)
        : undefined,
    })),
  };
};

export const fetchMetalIssues = async (
  runId: string,
): Promise<import("@/lib/types").ProductionRunMetalIssue[]> => {
  const { data } = await api.get(`/api/production-runs/${runId}/metal-issues`);
  return data.map((issue: import("@/lib/types").ProductionRunMetalIssue) => ({
    ...issue,
    stage: normalizeProductionRunStage(issue.stage),
  }));
};

export const issueMetalToKarigar = async (
  runId: string,
  stageSlug: string,
  input: {
    karigarName: string;
    weightIssuedGrams: number;
    metalLotId?: string;
    purity: string;
  },
): Promise<import("@/lib/types").ProductionRunMetalIssue> => {
  const { data } = await api.post(
    `/api/production-runs/${runId}/stages/${stageSlug}/metal-issue`,
    input,
  );
  return { ...data, stage: normalizeProductionRunStage(data.stage) };
};

export const recordMetalReturn = async (
  runId: string,
  issueId: string,
  input: { weightReturnedGrams: number; lossReason?: string },
): Promise<import("@/lib/types").ProductionRunMetalIssue> => {
  const { data } = await api.post(
    `/api/production-runs/${runId}/metal-issues/${issueId}/return`,
    input,
  );
  return { ...data, stage: normalizeProductionRunStage(data.stage) };
};
