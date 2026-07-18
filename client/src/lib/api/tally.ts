import { api, getAuthToken } from "./client";
import type { TallyExportLog, TallyExportType } from "@/lib/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ?? "http://localhost:4000";

export const fetchTallyExportLogs = async (): Promise<TallyExportLog[]> => {
  const { data } = await api.get<TallyExportLog[]>("/api/tally/export-logs");
  return data;
};

export const downloadTallyExport = async (params: {
  from: string;
  to: string;
  types: TallyExportType[];
}): Promise<{ blob: Blob; fileName: string }> => {
  const token = getAuthToken();
  const query = new URLSearchParams({
    from: params.from,
    to: params.to,
    types: params.types.join(","),
  });

  const response = await fetch(`${API_BASE_URL}/api/tally/export?${query.toString()}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(payload?.error ?? "Failed to generate Tally export.");
  }

  const disposition = response.headers.get("Content-Disposition") ?? "";
  const match = disposition.match(/filename="([^"]+)"/);
  const fileName = match?.[1] ?? "tally-export.xml";
  const blob = await response.blob();
  return { blob, fileName };
};
