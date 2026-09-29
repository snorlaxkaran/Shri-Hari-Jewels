import { api } from "./client";
import type { AuthUser } from "@/lib/types";

export type TrialSession = {
  token: string;
  refreshToken: string;
  user: AuthUser;
  needsSetup: boolean;
};

export type RegisterTrialInput = {
  phone: string;
  userId: string;
  password: string;
  name?: string;
};

export const registerTrial = async (input: RegisterTrialInput): Promise<TrialSession> => {
  const { data } = await api.post("/api/trial/register", input);
  return data;
};
