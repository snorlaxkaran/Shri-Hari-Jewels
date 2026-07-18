import type {
  Lead,
  LeadDetail,
  LeadStage,
  NewFollowUpInput,
  NewLeadInput,
  UpdateLeadInput,
  Appointment,
  FollowUp,
} from "@/lib/types";
import { api } from "./client";

export const fetchLeads = async (): Promise<Lead[]> => {
  const { data } = await api.get<{ leads: Lead[] }>("/api/leads");
  return data.leads;
};

export const fetchLead = async (id: string): Promise<LeadDetail> => {
  const { data } = await api.get<LeadDetail>(`/api/leads/${id}`);
  return data;
};

export const createLead = async (input: NewLeadInput): Promise<Lead> => {
  const { data } = await api.post<Lead>("/api/leads", input);
  return data;
};

export const updateLead = async (
  id: string,
  input: UpdateLeadInput,
): Promise<Lead> => {
  const { data } = await api.patch<Lead>(`/api/leads/${id}`, input);
  return data;
};

export const moveLeadStage = async (
  id: string,
  stage: LeadStage,
  lostReason?: string,
): Promise<Lead> => {
  const { data } = await api.post<Lead>(`/api/leads/${id}/stage`, {
    stage,
    lostReason,
  });
  return data;
};

export const addLeadFollowUp = async (
  id: string,
  input: NewFollowUpInput,
): Promise<FollowUp> => {
  const { data } = await api.post<FollowUp>(`/api/leads/${id}/follow-ups`, input);
  return data;
};

export const completeLeadFollowUp = async (
  leadId: string,
  followUpId: string,
  outcome?: string,
): Promise<FollowUp> => {
  const { data } = await api.post<FollowUp>(
    `/api/leads/${leadId}/follow-ups/${followUpId}/complete`,
    { outcome },
  );
  return data;
};

export const convertLead = async (
  id: string,
): Promise<{ lead: Lead; customerId: string }> => {
  const { data } = await api.post<{ lead: Lead; customerId: string }>(
    `/api/leads/${id}/convert`,
  );
  return data;
};

export const fetchFollowUpsDueCount = async (): Promise<number> => {
  const { data } = await api.get<{ count: number }>(
    "/api/leads/follow-ups-due-count",
  );
  return data.count;
};

export type LeadCalendarResponse = {
  appointments: Array<Appointment & { leadName: string; assignedToName?: string }>;
  followUps: Array<FollowUp & { leadName: string; assignedToName?: string }>;
};

export const fetchLeadCalendar = async (
  assignedToId?: string,
): Promise<LeadCalendarResponse> => {
  const { data } = await api.get<LeadCalendarResponse>("/api/leads/calendar", {
    params: assignedToId ? { assignedToId } : undefined,
  });
  return data;
};
