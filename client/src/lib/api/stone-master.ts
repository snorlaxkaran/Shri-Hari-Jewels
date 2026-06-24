import { api } from "./client";
import type {
  NewStoneMasterInput,
  StoneCategory,
  StoneMaster,
  UpdateStoneMasterInput,
} from "@/lib/types";

export const fetchStoneMasters = async (params?: {
  category?: StoneCategory;
  activeOnly?: boolean;
  search?: string;
}): Promise<StoneMaster[]> => {
  const { data } = await api.get<StoneMaster[]>("/api/stone-master", { params });
  return data;
};

export const fetchStoneMaster = async (id: string): Promise<StoneMaster> => {
  const { data } = await api.get<StoneMaster>(`/api/stone-master/${id}`);
  return data;
};

export const createStoneMaster = async (
  input: NewStoneMasterInput,
): Promise<StoneMaster> => {
  const { data } = await api.post<StoneMaster>("/api/stone-master", input);
  return data;
};

export const updateStoneMaster = async (
  id: string,
  input: UpdateStoneMasterInput,
): Promise<StoneMaster> => {
  const { data } = await api.put<StoneMaster>(`/api/stone-master/${id}`, input);
  return data;
};
