import { api } from "./client";

export type SubscriptionStatus =
  | "Trialing"
  | "Active"
  | "Past Due"
  | "Suspended"
  | "Cancelled";

export type SubscriptionSummary = {
  id: string;
  organizationId: string;
  status: SubscriptionStatus;
  planName: string;
  monthlyAmount: string;
  trialEndsAt: string;
  currentPeriodEnd: string;
  gracePeriodDays: number;
  suspendedAt: string | null;
  cancelledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type PlatformPaymentSummary = {
  id: string;
  amount: string;
  method: string;
  periodCovered: string;
  recordedByName: string;
  notes: string | null;
  createdAt: string;
};

export type BillingInfo = {
  subscription: SubscriptionSummary;
  payments: PlatformPaymentSummary[];
};

export type PlatformContactInfo = {
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
};

export const fetchBillingInfo = () =>
  api.get<BillingInfo>("/api/billing").then((r) => r.data);

export const fetchPlatformContact = () =>
  api.get<PlatformContactInfo>("/api/billing/contact").then((r) => r.data);

export {
  clearSubscriptionLockout,
  getSubscriptionLockout,
  SUBSCRIPTION_LOCKOUT_EVENT,
  SUBSCRIPTION_LOCKOUT_KEY,
} from "../subscription-lockout";

export type { SubscriptionExpiredPayload } from "../subscription-lockout";
