import { api } from "./client";

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

export const fetchOrganizations = () =>
  api.get<OrganizationSummary[]>("/organizations").then((r) => r.data);

export const createOrganization = (input: CreateOrganizationInput) =>
  api.post<OrganizationSummary>("/organizations", input).then((r) => r.data);

export const updateOrganization = (id: string, input: UpdateOrganizationInput) =>
  api.patch<OrganizationSummary>(`/organizations/${id}`, input).then((r) => r.data);

export const deleteOrganization = (id: string) =>
  api.delete(`/organizations/${id}`);
