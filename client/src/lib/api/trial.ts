import { api } from "./client";
import type { AuthUser } from "@/lib/types";

export type TrialSession = {
  token: string;
  refreshToken: string;
  user: AuthUser;
  needsSetup: boolean;
};

export const sendTrialOtp = async (
  phone: string,
): Promise<{ phone: string; devOtp?: string }> => {
  const { data } = await api.post("/api/trial/send-otp", { phone });
  return data;
};

export const verifyTrialOtp = async (
  phone: string,
  code: string,
): Promise<TrialSession> => {
  const { data } = await api.post("/api/trial/verify-otp", { phone, code });
  return data;
};
