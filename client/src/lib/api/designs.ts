import type {
  Design,
  NewDesignElementInput,
  NewDesignInput,
  UpdateDesignElementInput,
  UpdateDesignInput,
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
