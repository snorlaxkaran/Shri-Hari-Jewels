import { api } from "./client";

export type DemoRequestStatus =
  | "New"
  | "Contacted"
  | "Demo Scheduled"
  | "Won"
  | "Lost";

export type DemoRequest = {
  id: string;
  businessName: string;
  contactName: string;
  phone: string;
  email: string | null;
  city: string | null;
  businessType: string | null;
  message: string | null;
  status: DemoRequestStatus;
  createdAt: string;
};

export type SubmitDemoRequestPayload = {
  businessName: string;
  contactName: string;
  phone: string;
  email?: string;
  city?: string;
  businessType?: string;
  message?: string;
};

export const submitDemoRequest = async (
  payload: SubmitDemoRequestPayload,
): Promise<{ id: string; message: string }> => {
  const { data } = await api.post<{ id: string; message: string }>(
    "/api/demo-requests",
    payload,
  );
  return data;
};

export const fetchDemoRequests = async (): Promise<DemoRequest[]> => {
  const { data } = await api.get<DemoRequest[]>("/api/demo-requests");
  return data;
};

export const updateDemoRequestStatus = async (
  id: string,
  status: DemoRequestStatus,
): Promise<DemoRequest> => {
  const { data } = await api.patch<DemoRequest>(`/api/demo-requests/${id}/status`, {
    status,
  });
  return data;
};

export function demoRequestWhatsAppUrl(
  phone: string,
  request: Pick<DemoRequest, "businessName" | "contactName">,
): string {
  const digits = phone.replace(/\D/g, "");
  const withCountry = digits.length === 10 ? `91${digits}` : digits;
  const text = `Hi ${request.contactName}, thanks for your demo request for ${request.businessName}.`;
  return `https://wa.me/${withCountry}?text=${encodeURIComponent(text)}`;
}
