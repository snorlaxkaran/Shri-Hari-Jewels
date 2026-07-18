import { api, API_BASE_URL, getAuthToken } from "./client";
import type { ReportFilters } from "@/lib/reports/types";

const filtersToParams = (filters: ReportFilters): Record<string, string> => {
  const params: Record<string, string> = {};
  if (filters.branchId) params.branchId = filters.branchId;
  if (filters.category) params.category = filters.category;
  if (filters.department) params.department = filters.department;
  if (filters.customerId) params.customerId = filters.customerId;
  if (filters.from) params.from = filters.from;
  if (filters.to) params.to = filters.to;
  if (filters.groupBySku) params.groupBySku = "true";
  if (filters.minDays != null) params.minDays = String(filters.minDays);
  return params;
};

export const downloadReportPdf = async (
  reportKey: string,
  filters: ReportFilters,
  filename?: string,
): Promise<void> => {
  const token = getAuthToken();
  const params = new URLSearchParams(filtersToParams(filters));
  const url = `${API_BASE_URL}/api/reports/${reportKey}/pdf?${params.toString()}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(
      typeof err.error === "string" ? err.error : "Failed to generate PDF.",
    );
  }

  const blob = await response.blob();
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = blobUrl;
  link.download = filename ?? `${reportKey}-report.pdf`;
  link.click();
  URL.revokeObjectURL(blobUrl);
};

export const emailReport = async (
  reportKey: string,
  to: string,
  filters: ReportFilters,
): Promise<void> => {
  await api.post(`/api/reports/${reportKey}/email`, { to, filters });
};

export const fetchReport = async <T>(
  reportKey: string,
  filters: ReportFilters,
): Promise<T> => {
  const { data } = await api.get<T>(`/api/reports/${reportKey}`, {
    params: filtersToParams(filters),
  });
  return data;
};
