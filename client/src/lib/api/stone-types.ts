import { api } from "./client";
import type { NewStoneTypeInput, StoneType, UpdateStoneTypeInput } from "@/lib/types";

export const fetchStoneTypes = async (
  activeOnly = true,
): Promise<StoneType[]> => {
  const { data } = await api.get<StoneType[]>("/api/stone-types", {
    params: { activeOnly },
  });
  return data;
};

export const createStoneType = async (
  input: NewStoneTypeInput,
): Promise<StoneType> => {
  const { data } = await api.post<StoneType>("/api/stone-types", input);
  return data;
};

export const updateStoneType = async (
  id: string,
  input: UpdateStoneTypeInput,
): Promise<StoneType> => {
  const { data } = await api.patch<StoneType>(`/api/stone-types/${id}`, input);
  return data;
};
