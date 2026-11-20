import { api } from "./client";

export type AuditLogEntry = {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorName: string;
  createdAt: string;
  after?: { email?: string; at?: string };
};

export const fetchLoginAuditLogs = async (): Promise<AuditLogEntry[]> => {
  const { data } = await api.get<{ logs: AuditLogEntry[] }>("/api/audit", {
    params: { entityType: "User", action: "LOGIN" },
  });
  return data.logs;
};