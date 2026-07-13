"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageProductionRuns } from "@/lib/auth/permissions";
import { useProductionRuns } from "@/lib/production-runs/production-runs-context";
import {
  fetchKarigarSettlements,
  generateKarigarSettlements,
  settleKarigarSettlement,
} from "@/lib/api/karigar";
import { getApiErrorMessage } from "@/lib/api/client";
import type { KarigarSettlement } from "@/lib/types";

export default function KarigarSettlementsPage() {
  const { user } = useAuth();
  const canManage = user ? canManageProductionRuns(user.role) : false;
  const { productionRuns } = useProductionRuns();

  const [items, setItems] = useState<KarigarSettlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Open" | "Settled">("All");
  const [karigarFilter, setKarigarFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [generateRunId, setGenerateRunId] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await fetchKarigarSettlements({
        status: statusFilter === "All" ? undefined : statusFilter,
        karigarName: karigarFilter.trim() || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined,
      });
      setItems(rows);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to load settlements."));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, karigarFilter, fromDate, toDate]);

  useEffect(() => {
    void load();
  }, [load]);

  const completedRuns = useMemo(
    () => productionRuns.filter((r) => r.status === "Completed"),
    [productionRuns],
  );

  const handleGenerate = async () => {
    if (!generateRunId) return;
    setBusy(true);
    setError("");
    try {
      await generateKarigarSettlements(generateRunId);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to generate settlements."));
    } finally {
      setBusy(false);
    }
  };

  const handleSettle = async (id: string) => {
    setBusy(true);
    try {
      await settleKarigarSettlement(id);
      await load();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to mark as settled."));
    } finally {
      setBusy(false);
    }
  };

  if (loading && items.length === 0) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Karigar Settlements"
        subtitle="Review metal wastage and making-charge wages per karigar"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {canManage && (
        <div className="surface-card p-4 mb-4 flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-zinc-500 block mb-1">
              Generate from production run
            </label>
            <select
              value={generateRunId}
              onChange={(e) => setGenerateRunId(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            >
              <option value="">Select completed run…</option>
              {completedRuns.map((run) => (
                <option key={run.id} value={run.id}>
                  {run.runNo} — {run.designCode}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            disabled={!generateRunId || busy}
            onClick={() => void handleGenerate()}
            className="btn-primary px-4 py-2 text-sm"
          >
            Generate drafts
          </button>
        </div>
      )}

      <div className="filter-bar flex-wrap">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="filter-select"
        >
          <option value="All">All statuses</option>
          <option value="Open">Open</option>
          <option value="Settled">Settled</option>
        </select>
        <input
          value={karigarFilter}
          onChange={(e) => setKarigarFilter(e.target.value)}
          placeholder="Filter karigar…"
          className="filter-select"
        />
        <input
          type="date"
          value={fromDate}
          onChange={(e) => setFromDate(e.target.value)}
          className="filter-select"
        />
        <input
          type="date"
          value={toDate}
          onChange={(e) => setToDate(e.target.value)}
          className="filter-select"
        />
        <span className="filter-count">{items.length} settlements</span>
      </div>

      {items.length === 0 ? (
        <div className="surface-card px-5 py-8 text-center text-sm text-zinc-500">
          No settlements match your filters.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm surface-card">
            <thead>
              <tr className="border-b border-zinc-200 text-left text-xs text-zinc-500">
                <th className="px-4 py-3">Karigar</th>
                <th className="px-4 py-3">Run</th>
                <th className="px-4 py-3">Issued (g)</th>
                <th className="px-4 py-3">Returned (g)</th>
                <th className="px-4 py-3">Wastage (g)</th>
                <th className="px-4 py-3">Wastage ₹</th>
                <th className="px-4 py-3">Making ₹</th>
                <th className="px-4 py-3">Total ₹</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <SettlementRow
                  key={row.id}
                  row={row}
                  canManage={canManage}
                  busy={busy}
                  onSettle={() => void handleSettle(row.id)}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SettlementRow({
  row,
  canManage,
  busy,
  onSettle,
}: {
  row: KarigarSettlement;
  canManage: boolean;
  busy: boolean;
  onSettle: () => void;
}) {
  const runLabel = row.productionRunId?.slice(0, 8) ?? "—";

  return (
    <tr className="border-b border-zinc-100">
      <td className="px-4 py-3 font-medium">{row.karigarName}</td>
      <td className="px-4 py-3 text-zinc-500">{runLabel}</td>
      <td className="px-4 py-3">{row.metalIssuedGrams.toFixed(3)}</td>
      <td className="px-4 py-3">{row.metalReturnedGrams.toFixed(3)}</td>
      <td className="px-4 py-3">{row.wastageGrams.toFixed(3)}</td>
      <td className="px-4 py-3">₹{row.wastageCost.toLocaleString("en-IN")}</td>
      <td className="px-4 py-3">₹{row.makingChargeWage.toLocaleString("en-IN")}</td>
      <td className="px-4 py-3 font-medium">
        ₹{row.totalPayable.toLocaleString("en-IN")}
      </td>
      <td className="px-4 py-3">
        <span
          className={`px-2 py-0.5 rounded-full text-xs ${
            row.status === "Settled"
              ? "bg-emerald-100 text-emerald-700"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {row.status}
        </span>
      </td>
      <td className="px-4 py-3">
        {canManage && row.status === "Open" && (
          <button
            type="button"
            disabled={busy}
            onClick={onSettle}
            className="btn-secondary px-3 py-1 text-xs"
          >
            Mark settled
          </button>
        )}
      </td>
    </tr>
  );
}
