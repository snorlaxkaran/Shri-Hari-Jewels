import type { Branch, NewBranchInput, UpdateBranchInput } from "@/lib/types";
import { api } from "./client";

export const fetchBranches = async (): Promise<Branch[]> => {
  const { data } = await api.get<Branch[]>("/api/branches");
  return data;
};

export const fetchUserBranches = async (): Promise<Branch[]> => {
  const { data } = await api.get<Branch[]>("/api/branches/user/me");
  return data;
};

export const createBranch = async (input: NewBranchInput): Promise<Branch> => {
  const { data } = await api.post<Branch>("/api/branches", input);
  return data;
};

export const updateBranch = async (
  id: string,
  input: UpdateBranchInput,
): Promise<Branch> => {
  const { data } = await api.patch<Branch>(`/api/branches/${id}`, input);
  return data;
};

export const deactivateBranch = async (id: string): Promise<Branch> => {
  const { data } = await api.delete<Branch>(`/api/branches/${id}`);
  return data;
};
