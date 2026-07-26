import { api } from "./client";
import type { SubscriptionSummary } from "./billing";

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  emailDomain: string | null;
  active: boolean;
  branchCount: number;
  userCount: number;
  adminEmail: string | null;
  createdAt: string;
  updatedAt: string;
  subscription: SubscriptionSummary | null;
};

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  emailDomain?: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
};

export type UpdateOrganizationInput = {
  name?: string;
  slug?: string;
  emailDomain?: string | null;
  active?: boolean;
};

export const fetchOrganizations = (options?: { expiringSoon?: number }) =>
  api
    .get<OrganizationSummary[]>("/api/organizations", {
      params: options?.expiringSoon != null ? { expiringSoon: options.expiringSoon } : undefined,
    })
    .then((r) => r.data);

export const createOrganization = (input: CreateOrganizationInput) =>
  api.post<OrganizationSummary>("/api/organizations", input).then((r) => r.data);

export const updateOrganization = (id: string, input: UpdateOrganizationInput) =>
  api.patch<OrganizationSummary>(`/api/organizations/${id}`, input).then((r) => r.data);

export const deleteOrganization = (id: string) =>
  api.delete(`/api/organizations/${id}`);

export type OrganizationSubscriptionDetail = {
  organizationId: string;
  organizationName: string;
  subscription: SubscriptionSummary | null;
  payments: import("./billing").PlatformPaymentSummary[];
};

export const fetchOrganizationSubscription = (organizationId: string) =>
  api
    .get<OrganizationSubscriptionDetail>(`/api/organizations/${organizationId}/subscription`)
    .then((r) => r.data);

export type RecordPaymentInput = {
  amount: number;
  method: string;
  periodCovered?: string;
  notes?: string;
};

export const recordSubscriptionPayment = (
  organizationId: string,
  input: RecordPaymentInput,
) =>
  api
    .post<{ subscription: SubscriptionSummary; payment: import("./billing").PlatformPaymentSummary }>(
      `/api/organizations/${organizationId}/subscription/record-payment`,
      input,
    )
    .then((r) => r.data);

export const extendSubscriptionTrial = (
  organizationId: string,
  newTrialEndsAt: string,
) =>
  api
    .post<SubscriptionSummary>(
      `/api/organizations/${organizationId}/subscription/extend-trial`,
      { newTrialEndsAt },
    )
    .then((r) => r.data);

export const suspendSubscription = (organizationId: string) =>
  api
    .post<SubscriptionSummary>(`/api/organizations/${organizationId}/subscription/suspend`)
    .then((r) => r.data);

export const reactivateSubscription = (organizationId: string) =>
  api
    .post<SubscriptionSummary>(`/api/organizations/${organizationId}/subscription/reactivate`)
    .then((r) => r.data);
