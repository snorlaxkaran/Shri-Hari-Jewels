import type {
  ConfirmedDesignImportRow,
  Design,
  DesignElementDiff,
  DesignImportPreview,
  NewDesignElementInput,
  NewDesignInput,
  UpdateDesignElementInput,
  UpdateDesignInput,
  UpdateDesignBuilderInput,
} from "@/lib/types";
import { api } from "./client";

export const fetchDesigns = async (): Promise<Design[]> => {
  const { data } = await api.get<Design[]>("/api/designs");
  return data;
};

export const createDesign = async (input: NewDesignInput): Promise<Design> => {
  const { data } = await api.post<Design>("/api/designs", input);
  return data;
};

export const updateDesign = async (
  id: string,
  input: UpdateDesignInput,
): Promise<Design> => {
  const { data } = await api.patch<Design>(`/api/designs/${id}`, input);
  return data;
};

export const deleteDesign = async (id: string): Promise<void> => {
  await api.delete(`/api/designs/${id}`);
};

export const addDesignElement = async (
  designId: string,
  input: NewDesignElementInput,
): Promise<Design> => {
  const { data } = await api.post<Design>(
    `/api/designs/${designId}/elements`,
    input,
  );
  return data;
};

export const updateDesignElement = async (
  designId: string,
  elementId: string,
  input: UpdateDesignElementInput,
): Promise<Design> => {
  const { data } = await api.patch<Design>(
    `/api/designs/${designId}/elements/${elementId}`,
    input,
  );
  return data;
};

export const deleteDesignElement = async (
  designId: string,
  elementId: string,
): Promise<Design> => {
  const { data } = await api.delete<Design>(
    `/api/designs/${designId}/elements/${elementId}`,
  );
  return data;
};

export const computeDesignElementDiff = async (
  designId: string,
  elements: NewDesignElementInput[],
): Promise<DesignElementDiff> => {
  const { data } = await api.post<DesignElementDiff>(
    `/api/designs/${designId}/elements/diff`,
    { elements },
  );
  return data;
};

export const replaceDesignElements = async (
  designId: string,
  elements: NewDesignElementInput[],
  reason?: string,
): Promise<Design> => {
  const { data } = await api.post<Design>(
    `/api/designs/${designId}/elements/replace`,
    { elements, reason },
  );
  return data;
};

export const previewDesignImport = async (
  designId: string,
  rows: unknown[][],
  sheetName: string,
): Promise<DesignImportPreview> => {
  const { data } = await api.post<DesignImportPreview>(
    `/api/designs/${designId}/import/preview`,
    { rows, sheetName },
  );
  return data;
};

export const applyDesignImport = async (
  designId: string,
  rows: ConfirmedDesignImportRow[],
  reason?: string,
): Promise<Design> => {
  const { data } = await api.post<Design>(
    `/api/designs/${designId}/import/apply`,
    { rows, reason },
  );
  return data;
};

export const fetchDesignPriceDrift = async (
  designId: string,
): Promise<import("@/lib/types").DesignElementPriceDrift[]> => {
  const { data } = await api.get(`/api/designs/${designId}/price-drift`);
  return data;
};

export const fetchDesignAuditLog = async (
  designId: string,
  limit = 10,
): Promise<import("@/lib/types").CatalogAuditLog[]> => {
  const { data } = await api.get(`/api/designs/${designId}/audit-log`, {
    params: { limit },
  });
  return data;
};

export const acceptDesignElementPrice = async (
  designId: string,
  elementId: string,
  motifId: string,
): Promise<Design> => {
  const { data } = await api.patch<Design>(
    `/api/designs/${designId}/elements/${elementId}`,
    { motifId },
  );
  return data;
};

export const updateDesignBuilder = async (
  designId: string,
  input: UpdateDesignBuilderInput,
): Promise<Design> => {
  const { data } = await api.patch<Design>(
    `/api/designs/${designId}/builder`,
    input,
  );
  return data;
};

export const advanceDesignBuilder = async (
  designId: string,
): Promise<{ design: Design; nextStage: import("@/lib/types").DesignBuilderStage | null }> => {
  const { data } = await api.post(`/api/designs/${designId}/builder/advance`);
  return data;
};
