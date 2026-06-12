import type { AuthUser, LoginInput } from "@/lib/types";
import { api } from "./client";

export const login = async (
  input: LoginInput,
): Promise<{ token: string; user: AuthUser }> => {
  const { data } = await api.post<{ token: string; user: AuthUser }>(
    "/api/auth/login",
    input,
  );
  return data;
};

export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const { data } = await api.get<{ user: AuthUser }>("/api/auth/me");
  return data.user;
};
