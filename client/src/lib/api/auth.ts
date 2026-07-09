import type { AuthUser, LoginInput } from "@/lib/types";
import { api } from "./client";

export type LoginResponse =
  | { requires2FA: true; tempToken: string; user: AuthUser }
  | { token: string; refreshToken: string; user: AuthUser };

export const login = async (input: LoginInput): Promise<LoginResponse> => {
  const { data } = await api.post<LoginResponse>("/api/auth/login", input);
  return data;
};

export const verify2fa = async (
  tempToken: string,
  code: string,
): Promise<{ token: string; refreshToken: string; user: AuthUser }> => {
  const { data } = await api.post("/api/auth/2fa/verify", { tempToken, code });
  return data;
};

export const refreshSession = async (
  refreshToken: string,
): Promise<{ token: string; refreshToken: string; user: AuthUser }> => {
  const { data } = await api.post("/api/auth/refresh", { refreshToken });
  return data;
};

export const logoutApi = async (refreshToken?: string): Promise<void> => {
  await api.post("/api/auth/logout", { refreshToken });
};

export const fetchCurrentUser = async (): Promise<AuthUser> => {
  const { data } = await api.get<{ user: AuthUser }>("/api/auth/me");
  return data.user;
};

export const setup2fa = async (): Promise<{ secret: string; uri: string }> => {
  const { data } = await api.post("/api/auth/2fa/setup");
  return data;
};

export const confirm2fa = async (code: string): Promise<void> => {
  await api.post("/api/auth/2fa/confirm", { code });
};

export const disable2fa = async (code: string): Promise<void> => {
  await api.post("/api/auth/2fa/disable", { code });
};
