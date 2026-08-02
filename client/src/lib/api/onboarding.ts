import { api } from "./client";
import type { JewelleryModuleId } from "@/lib/onboarding/config";

export type OnboardingProfile = {
  implementingFor: string | null;
  teamSize: string | null;
  businessType: string | null;
  currentSystem: string | null;
  enabledModules: JewelleryModuleId[];
  loadDemoData: boolean;
};

export type ModuleOnboardingState = {
  title: string;
  complete: boolean;
  dismissed: boolean;
  steps: Record<string, boolean>;
};

export type OnboardingStatus = {
  completed: boolean;
  account: {
    email: string;
    name: string;
    credentialsConfigured: boolean;
  };
  profile: OnboardingProfile;
  steps: {
    credentialsConfigured: boolean;
    businessInfo: boolean;
    gstConfigured: boolean;
    branchCreated: boolean;
    openingStock: boolean;
    personaComplete: boolean;
  };
  modules: Partial<Record<JewelleryModuleId, ModuleOnboardingState>>;
};

export type SetupCredentialsInput = {
  email: string;
  password: string;
  name?: string;
};

export type SetupProfileInput = {
  implementingFor?: string;
  teamSize?: string;
  businessType?: string;
  currentSystem?: string;
  enabledModules?: string[];
  businessName?: string;
  gstNumber?: string;
  loadDemoData?: boolean;
};

export const fetchOnboardingStatus = async (): Promise<OnboardingStatus> => {
  const { data } = await api.get("/api/onboarding/status");
  return data;
};

export const saveSetupCredentials = async (
  input: SetupCredentialsInput,
): Promise<OnboardingStatus> => {
  const { data } = await api.post("/api/onboarding/credentials", input);
  return data.status;
};

export const saveSetupProfile = async (
  input: SetupProfileInput,
): Promise<OnboardingStatus> => {
  const { data } = await api.post("/api/onboarding/profile", input);
  return data;
};

export const completeOnboarding = async (): Promise<void> => {
  await api.post("/api/onboarding/complete");
};

export const dismissModuleOnboarding = async (
  moduleId: JewelleryModuleId,
): Promise<void> => {
  await api.post(`/api/onboarding/modules/${moduleId}/dismiss`);
};
