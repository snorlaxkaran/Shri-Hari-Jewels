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
