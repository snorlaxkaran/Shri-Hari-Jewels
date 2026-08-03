"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Check, ScanLine } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";
import StatusBadge from "@/app/(components)/StatusBadge";
import {
  closeStockAuditSession,
  fetchStockAuditSession,
  scanStockAuditItem,
} from "@/lib/api/stock-audit";
import { getApiErrorMessage } from "@/lib/api/client";
import { canManageStockAudit } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import type { StockAuditSession } from "@/lib/types";
import { formatDateTime } from "@/lib/format";

export default function StockAuditSessionPage() {
  const params = useParams<{ id: string }>();
  const sessionId = params.id;
  const { user } = useAuth();
  const canManage = user ? canManageStockAudit(user.role) : false;

  const [session, setSession] = useState<StockAuditSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [closing, setClosing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadSession = useCallback(async () => {
    try {
      const data = await fetchStockAuditSession(sessionId);
      setSession(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load audit session."));
    } finally {
      setLoading(false);
    }
  }, [sessionId]);

  useEffect(() => {
    void loadSession();
  }, [loadSession]);

  useEffect(() => {
    if (session?.status === "Open" && canManage) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [session, canManage]);

  const handleScan = async () => {
    if (!session || !canManage || session.status !== "Open") return;
    const code = barcode.trim();
    if (!code) return;

    setScanning(true);
    setError("");
    setInfo("");
    try {
      const updated = await scanStockAuditItem(session.id, code);
      setSession(updated);
      setBarcode("");
      setInfo(`Scanned ${updated.scans[0]?.itemCode ?? code}.`);
      inputRef.current?.focus();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to scan item."));
    } finally {
      setScanning(false);
    }
  };

  const handleClose = async () => {
    if (!session || !canManage) return;
    setClosing(true);
    setError("");
    try {
      const updated = await closeStockAuditSession(session.id);
      setSession(updated);
      setInfo("Audit session closed.");
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to close audit session."));
    } finally {
      setClosing(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (!session) {
    return (
      <div className="page-content">
        <PageHeader title="Stock audit" subtitle="Session not found" />
        <Link href="/inventory/audit" className="btn-secondary mt-4 inline-flex px-4 py-2 text-sm">
          Back to audit
        </Link>
      </div>
    );
  }

  return (
    <div className="page-content pb-28">
      <PageHeader
        title={`${session.metalLabel} audit`}
        subtitle="Scan each physical piece. A barcode can only be scanned once in this audit."
      />

      <Link
        href="/inventory/audit"
        className="mb-4 inline-flex items-center gap-2 text-sm text-zinc-600 hover:text-zinc-900"
      >
        <ArrowLeft size={16} />
        Back to stock audit
      </Link>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {info}
        </div>
      )}

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="surface-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="data-table min-w-[640px]">
              <thead>
                <tr>
                  <th>User name</th>
                  <th>Metal</th>
                  <th>Counted</th>
                  <th>Pending</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="font-medium text-zinc-900">{session.startedByName}</td>
                  <td>{session.metalLabel}</td>
                  <td className="td-num">{session.counted}</td>
                  <td className="td-num">{session.pending}</td>
                  <td>
                    <StatusBadge status={session.status} />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Progress
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {session.counted}
            <span className="text-lg font-normal text-zinc-400">
              {" "}
              / {session.expectedCount}
            </span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {session.pending > 0
              ? `${session.pending} piece(s) still pending in system count.`
              : "All expected pieces have been scanned."}
          </p>
        </div>
      </div>

      {canManage && session.status === "Open" && (
        <div className="surface-card mb-5 p-5">
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Scan barcode
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <ScanLine
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleScan();
                  }
                }}
                placeholder="Scan item code"
                className="input-field w-full py-2 pl-9 pr-4 text-sm"
                disabled={scanning || closing}
                autoFocus
              />
            </div>
            <button
              type="button"
              onClick={() => void handleScan()}
              disabled={scanning || closing || !barcode.trim()}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              {scanning ? "Scanning..." : "Scan"}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">
            Only {session.metalLabel.toLowerCase()} pieces at your branch can be scanned.
            Duplicate scans and wrong-metal items are rejected.
          </p>
        </div>
      )}

      <div className="surface-card overflow-hidden">
        <div className="border-b border-zinc-100 px-5 py-3">
          <h2 className="text-sm font-semibold text-zinc-800">Scanned items</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th className="w-10" />
                <th>Item code</th>
                <th>Scanned by</th>
                <th>Scanned at</th>
              </tr>
            </thead>
            <tbody>
              {session.scans.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-sm text-zinc-500">
                    No items scanned yet.
                  </td>
                </tr>
              ) : (
                session.scans.map((scan) => (
                  <tr key={scan.id} className="bg-emerald-50/40">
                    <td>
                      <Check size={16} className="text-emerald-600" />
                    </td>
                    <td className="td-code">
                      <ItemCodeLink itemCode={scan.itemCode} className="text-xs" />
                    </td>
                    <td>{scan.scannedByName}</td>
                    <td className="td-muted">{formatDateTime(scan.scannedAt)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {canManage && session.status === "Open" && (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:left-[220px]">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
            <Link
              href="/inventory/audit"
              className="btn-secondary px-4 py-2 text-sm"
            >
              Save & exit
            </Link>
            <button
              type="button"
              onClick={() => void handleClose()}
              disabled={closing || scanning}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {closing ? "Closing..." : "Close audit"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
