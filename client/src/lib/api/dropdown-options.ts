import { api } from "./client";
import type {
  DropdownOption,
  NewDropdownOptionInput,
  ReorderDropdownOptionsInput,
  UpdateDropdownOptionInput,
} from "@/lib/types";

export const fetchDropdownOptions = async (
  fieldKey?: string,
  activeOnly = true,
): Promise<DropdownOption[]> => {
  const { data } = await api.get<DropdownOption[]>("/api/dropdown-options", {
    params: {
      ...(fieldKey ? { fieldKey } : {}),
      activeOnly,
    },
  });
  return data;
};

export const createDropdownOption = async (
  input: NewDropdownOptionInput,
): Promise<DropdownOption> => {
  const { data } = await api.post<DropdownOption>("/api/dropdown-options", input);
  return data;
};

export const updateDropdownOption = async (
  id: string,
  input: UpdateDropdownOptionInput,
): Promise<DropdownOption> => {
  const { data } = await api.patch<DropdownOption>(`/api/dropdown-options/${id}`, input);
  return data;
};

export const reorderDropdownOptions = async (
  input: ReorderDropdownOptionsInput,
): Promise<DropdownOption[]> => {
  const { data } = await api.patch<DropdownOption[]>("/api/dropdown-options/reorder", input);
  return data;
};
