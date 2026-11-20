import { api } from "./client";

export type ProvisionedCredentialSummary = {
  userId: string;
  email: string;
  name: string;
  role: string;
  organizationId: string | null;
  organizationName?: string;
  setAt: string;
  setByName: string;
  source: string;
};

export type ProvisionedPasswordReveal = {
  password: string;
  setAt: string;
  setByName: string;
  source: string;
};

export const fetchProvisionedCredentials = async (): Promise<ProvisionedCredentialSummary[]> => {
  const { data } = await api.get<{ entries: ProvisionedCredentialSummary[] }>(
    "/api/platform/credentials",
  );
  return data.entries;
};

export const revealPlatformProvisionedPassword = async (
  userId: string,
): Promise<ProvisionedPasswordReveal> => {
  const { data } = await api.get<ProvisionedPasswordReveal>(
    `/api/platform/credentials/users/${encodeURIComponent(userId)}/provisioned-password`,
  );
  return data;
};