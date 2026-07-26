export type SubscriptionExpiredPayload = {
  error: "subscription_expired";
  message: string;
  status?: string;
  trialEndsAt: string;
  currentPeriodEnd: string;
};

export const SUBSCRIPTION_LOCKOUT_KEY = "shj_subscription_lockout";
export const SUBSCRIPTION_LOCKOUT_EVENT = "shj:subscription-lockout";

export const setSubscriptionLockout = (payload: SubscriptionExpiredPayload) => {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(SUBSCRIPTION_LOCKOUT_KEY, JSON.stringify(payload));
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_LOCKOUT_EVENT, { detail: payload }));
};

export const clearSubscriptionLockout = () => {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(SUBSCRIPTION_LOCKOUT_KEY);
  window.dispatchEvent(new CustomEvent(SUBSCRIPTION_LOCKOUT_EVENT, { detail: null }));
};

export const getSubscriptionLockout = (): SubscriptionExpiredPayload | null => {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(SUBSCRIPTION_LOCKOUT_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SubscriptionExpiredPayload;
  } catch {
    return null;
  }
};
