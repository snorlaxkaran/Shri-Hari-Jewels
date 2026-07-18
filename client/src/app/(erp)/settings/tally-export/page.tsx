"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Download } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canExportTally } from "@/lib/auth/permissions";
import { downloadTallyExport, fetchTallyExportLogs } from "@/lib/api/tally";
import { getApiErrorMessage } from "@/lib/api/client";
import type { TallyExportLog, TallyExportType } from "@/lib/types";
import { formatDate, formatDateTime } from "@/lib/format";

const EXPORT_TYPES: { id: TallyExportType; label: string }[] = [
  { id: "sales", label: "Sales vouchers" },
  { id: "purchases", label: "Purchase vouchers" },
  { id: "receipts", label: "Receipts (scheme installments)" },
  { id: "payments", label: "Payments (vendor bill payments)" },
];

export default function TallyExportPage() {
  const { user } = useAuth();
  const canExport = user ? canExportTally(user.role) : false;
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<TallyExportType[]>([
    "sales",
    "purchases",
  ]);
  const [logs, setLogs] = useState<TallyExportLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await fetchTallyExportLogs());
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (canExport) void loadLogs();
    else setLoading(false);
  }, [canExport, loadLogs]);

  const toggleType = (type: TallyExportType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  const handleExport = async () => {
    if (!from || !to) {
      setError("Select a date range.");
      return;
    }
    if (selectedTypes.length === 0) {
      setError("Select at least one voucher type.");
      return;
    }

    setExporting(true);
    setError("");
    setSuccess("");
    try {
      const { blob, fileName } = await downloadTallyExport({
        from,
        to,
        types: selectedTypes,
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      anchor.click();
      URL.revokeObjectURL(url);
      setSuccess(`Downloaded ${fileName}`);
      await loadLogs();
    } catch (err) {
      setError(getApiErrorMessage(err, "Export failed."));
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (!canExport) {
    return (
      <div className="page-content">
        <PageHeader title="Tally Export" subtitle="Generate XML for Tally Prime import" />
        <div className="surface-card p-8 text-center text-sm text-zinc-400">
          Only admins and accountants can export to Tally.
        </div>
      </div>
    );
  }

  return (
    <div className="page-content max-w-3xl">
      <Link
        href="/settings"
        className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-800 mb-4"
      >
        <ArrowLeft size={16} />
        Back to settings
      </Link>

      <PageHeader
        title="Tally Export"
        subtitle="Generate voucher XML for manual import into Tally Prime"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-green-200 bg-green-50 text-green-700">
          {success}
        </div>
      )}

      <div className="surface-card p-5 space-y-4 mb-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">From</label>
            <input type="date" className="input-field w-full px-3 py-2 text-sm" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">To</label>
            <input type="date" className="input-field w-full px-3 py-2 text-sm" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-500 mb-2">Include voucher types</p>
          <div className="space-y-2">
            {EXPORT_TYPES.map((type) => (
              <label key={type.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTypes.includes(type.id)}
                  onChange={() => toggleType(type.id)}
                />
                {type.label}
              </label>
            ))}
          </div>
        </div>

        <button
          type="button"
          disabled={exporting}
          onClick={() => void handleExport()}
          className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Download size={16} />
          {exporting ? "Generating…" : "Generate Tally XML"}
        </button>
      </div>

      <div className="surface-card p-5 mb-6 text-sm text-zinc-600 space-y-2">
        <p className="font-medium text-zinc-800">How to import in Tally Prime</p>
        <ol className="list-decimal pl-5 space-y-1">
          <li>Gateway of Tally → Import Data → Vouchers</li>
          <li>Select the downloaded `.xml` file</li>
          <li>Ensure ledgers exist in Tally: Sales Account, Purchase Account, Cash, Bank, Output/Input GST</li>
          <li>Customer and vendor names export as party ledgers — create them under Sundry Debtors/Creditors first, or let Tally create on import if configured</li>
        </ol>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="px-5 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-800">Recent exports</h2>
        </div>
        {logs.length === 0 ? (
          <p className="px-5 py-6 text-sm text-zinc-400">No exports yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Period</th>
                  <th>Types</th>
                  <th>Exported by</th>
                  <th>File</th>
                  <th>When</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="td-muted">
                      {formatDate(log.fromDate)} – {formatDate(log.toDate)}
                    </td>
                    <td>{log.types.join(", ")}</td>
                    <td>{log.exportedByName}</td>
                    <td className="td-code">{log.fileName ?? "—"}</td>
                    <td className="td-muted">{formatDateTime(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
