"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
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

const METAL_FROM_SLUG: Record<string, StockAuditMetalGroup> = {
  gold: "Gold",
  silver: "Silver",
  alloy: "Alloy",
};

const METAL_LABEL: Record<StockAuditMetalGroup, string> = {
  Gold: "Gold",
  Silver: "Silver",
  Alloy: "Alloy",
};

export default function StockAuditMetalPage() {
  const router = useRouter();
  const params = useParams<{ metalGroup: string }>();
  const metalGroup = METAL_FROM_SLUG[params.metalGroup.toLowerCase()];
  const { user } = useAuth();
  const canManage = user ? canManageStockAudit(user.role) : false;

  const [sessions, setSessions] = useState<StockAuditSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState("");

  const loadSessions = useCallback(async () => {
    if (!metalGroup) return;
    try {
      const data = await fetchStockAuditSessions(metalGroup);
      setSessions(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load audit sessions."));
    } finally {
      setLoading(false);
    }
  }, [metalGroup]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const openSession = useMemo(
    () => sessions.find((session) => session.status === "Open"),
    [sessions],
  );

  const handleStartAudit = async () => {
    if (!metalGroup || !canManage) return;
    setStarting(true);
    setError("");
    try {
      const session = await createStockAuditSession(metalGroup);
      router.push(`/inventory/audit/session/${session.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not start audit."));
    } finally {
      setStarting(false);
    }
  };

  if (!metalGroup) {
    return (
      <div className="page-content">
        <PageHeader title="Stock audit" subtitle="Invalid metal selection" />
        <Link href="/inventory/audit" className="btn-secondary mt-4 inline-flex px-4 py-2 text-sm">
          Back to metal selection
        </Link>
      </div>
    );
  }

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title={`${METAL_LABEL[metalGroup]} audit`}
        subtitle="Each row is an audit session. Open a session to scan barcodes."
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => void handleStartAudit()}
              disabled={starting || Boolean(openSession)}
              className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm disabled:opacity-50"
              title={
                openSession
                  ? "Close the open audit before starting a new one"
                  : "Start a new stock audit"
              }
            >
              <Plus size={16} />
              {starting ? "Starting..." : "Start audit"}
            </button>
          ) : undefined
        }
      />

      <Link
        href="/inventory/audit"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft size={16} />
        Choose another metal
      </Link>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {openSession && (
        <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          An open audit is in progress.{" "}
          <Link
            href={`/inventory/audit/session/${openSession.id}`}
            className="font-medium underline"
          >
            Continue scanning
          </Link>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[720px]">
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
                    No {METAL_LABEL[metalGroup].toLowerCase()} audits yet.
                    {canManage ? " Start one to begin scanning." : ""}
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
                        className="text-sm font-medium text-zinc-800 hover:underline"
                      >
                        {session.status === "Open" ? "Continue" : "View"}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
