import { api } from "./client";

export type OnboardingStatus = {
  completed: boolean;
  steps: {
    businessInfo: boolean;
    gstConfigured: boolean;
    branchCreated: boolean;
    openingStock: boolean;
  };
};

export const fetchOnboardingStatus = async (): Promise<OnboardingStatus> => {
  const { data } = await api.get("/api/onboarding/status");
  return data;
};

export const completeOnboarding = async (): Promise<void> => {
  await api.post("/api/onboarding/complete");
};
