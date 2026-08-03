"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Plus, ScanLine, X } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import {
  createStockAuditSession,
  fetchStockAuditSessions,
} from "@/lib/api/stock-audit";
import { getApiErrorMessage } from "@/lib/api/client";
import { canManageStockAudit } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import type { StockAuditMetalGroup, StockAuditSession } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

const METAL_OPTIONS: Array<{
  group: StockAuditMetalGroup;
  label: string;
  description: string;
}> = [
  {
    group: "Gold",
    label: "Gold",
    description: "Gold and rose gold pieces",
  },
  {
    group: "Silver",
    label: "Silver",
    description: "Silver pieces only",
  },
  {
    group: "Alloy",
    label: "Alloy",
    description: "Base metal / alloy pieces",
  },
];

export default function StockAuditPage() {
  const { user } = useAuth();
  const canManage = user ? canManageStockAudit(user.role) : false;

  const [sessions, setSessions] = useState<StockAuditSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  const loadSessions = useCallback(async () => {
    try {
      const data = await fetchStockAuditSessions();
      setSessions(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load audit sessions."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const openMetalGroups = new Set(
    sessions.filter((s) => s.status === "Open").map((s) => s.metalGroup),
  );

  const handleStartAudit = async (metalGroup: StockAuditMetalGroup) => {
    if (!canManage) return;
    setStarting(true);
    setError("");
    try {
      await createStockAuditSession(metalGroup);
      setPickerOpen(false);
      await loadSessions();
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not start audit."));
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Stock audit"
        subtitle="All physical stock counts at your branch"
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              Start audit
            </button>
          ) : undefined
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[760px]">
            <thead>
              <tr>
                <th>User name</th>
                <th>Metal</th>
                <th>Counted</th>
                <th>Pending</th>
                <th>Status</th>
                <th>Started</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-sm text-zinc-500">
                    No audits yet.
                    {canManage ? " Click Start audit to begin a stock count." : ""}
                  </td>
                </tr>
              ) : (
                sessions.map((session) => (
                  <tr key={session.id}>
                    <td className="font-medium text-zinc-900">{session.startedByName}</td>
                    <td>{session.metalLabel}</td>
                    <td className="td-num">{session.counted}</td>
                    <td className="td-num">{session.pending}</td>
                    <td>
                      <StatusBadge status={session.status} />
                    </td>
                    <td className="td-muted">{formatDateTime(session.createdAt)}</td>
                    <td>
                      <Link
                        href={`/inventory/audit/session/${session.id}`}
                        className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium ${
                          session.status === "Open"
                            ? "btn-primary"
                            : "btn-secondary"
                        }`}
                      >
                        <ScanLine size={14} />
                        {session.status === "Open" ? "Scan pcs" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {pickerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div
            className="surface-card w-full max-w-md p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="start-audit-title"
          >
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <h2 id="start-audit-title" className="text-lg font-semibold text-zinc-900">
                  Choose metal
                </h2>
                <p className="mt-1 text-sm text-zinc-500">
                  Select which metal you want to audit.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPickerOpen(false)}
                className="rounded-md p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-2">
              {METAL_OPTIONS.map((option) => {
                const hasOpen = openMetalGroups.has(option.group);
                return (
                  <button
                    key={option.group}
                    type="button"
                    onClick={() => void handleStartAudit(option.group)}
                    disabled={starting || hasOpen}
                    className="flex w-full items-center justify-between rounded-lg border border-zinc-200 px-4 py-3 text-left transition-colors hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
                    title={
                      hasOpen
                        ? `An open ${option.label.toLowerCase()} audit already exists`
                        : undefined
                    }
                  >
                    <span>
                      <span className="block font-medium text-zinc-900">{option.label}</span>
                      <span className="block text-xs text-zinc-500">{option.description}</span>
                    </span>
                    {hasOpen ? (
                      <span className="text-xs text-amber-700">Already open</span>
                    ) : (
                      <span className="text-xs text-zinc-400">Start →</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
