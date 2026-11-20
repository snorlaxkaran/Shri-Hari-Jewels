import type { AppUser, CreateUserInput } from "@/lib/types";
import { api } from "./client";

export const fetchUsers = async (): Promise<AppUser[]> => {
  const { data } = await api.get<AppUser[]>("/api/users");
  return data;
};

export const createUser = async (input: CreateUserInput): Promise<AppUser> => {
  const { data } = await api.post<AppUser>("/api/users", input);
  return data;
};

export type ProvisionedPasswordReveal = {
  password: string;
  setAt: string;
  setByName: string;
  source: string;
};

export const revealProvisionedPassword = async (
  userId: string,
): Promise<ProvisionedPasswordReveal> => {
  const { data } = await api.get<ProvisionedPasswordReveal>(
    `/api/users/${encodeURIComponent(userId)}/provisioned-password`,
  );
  return data;
};

export const resetUserProvisionedPassword = async (
  userId: string,
  password: string,
): Promise<void> => {
  await api.post(`/api/users/${encodeURIComponent(userId)}/provisioned-password`, { password });
};
