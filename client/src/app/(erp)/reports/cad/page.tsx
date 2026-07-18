"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReport } from "@/lib/api/reports";
import ReportShell from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type CadDesign = {
  code: string;
  name: string;
  stage: string;
  cadReady: boolean;
  daysInStage: number;
  updatedAt: string;
};

type CadSummary = {
  stage: string;
  count: number;
  pendingCad: number;
};

export default function CadReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [designs, setDesigns] = useState<CadDesign[]>([]);
  const [summary, setSummary] = useState<CadSummary[]>([]);
  const [pendingCadCount, setPendingCadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReport<{
        designs: CadDesign[];
        summary: CadSummary[];
        pendingCadCount: number;
      }>("cad", filters);
      setDesigns(data.designs ?? []);
      setSummary(data.summary ?? []);
      setPendingCadCount(data.pendingCadCount ?? 0);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ReportShell
      title="CAD Pipeline Report"
      reportKey="cad"
      filters={["branch", "category", "department"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: "CAD Pipeline Report",
        filename: "cad-report",
        headers: ["Design Code", "Name", "Stage", "CAD Ready", "Days in Stage"],
        rows: designs.map((d) => [
          d.code,
          d.name,
          d.stage,
          d.cadReady ? "Yes" : "No",
          d.daysInStage,
        ]),
      }}
    >
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 mb-4">
        {summary.map((s) => (
          <div key={s.stage} className="surface-card p-3 rounded-lg text-center">
            <p className="text-xs text-zinc-500">{s.stage}</p>
            <p className="text-lg font-semibold">{s.count}</p>
            {s.pendingCad > 0 && (
              <p className="text-xs text-amber-600">{s.pendingCad} pending CAD</p>
            )}
          </div>
        ))}
      </div>

      {pendingCadCount > 0 && (
        <p className="text-sm text-amber-700 mb-3">
          {pendingCadCount} design(s) in CAD stage awaiting completion.
        </p>
      )}

      <div className="overflow-x-auto surface-card rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left p-3">Code</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Stage</th>
              <th className="text-center p-3">CAD Ready</th>
              <th className="text-right p-3">Days in Stage</th>
            </tr>
          </thead>
          <tbody>
            {designs.map((d) => (
              <tr key={d.code} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="p-3 font-mono text-xs">{d.code}</td>
                <td className="p-3">{d.name || "—"}</td>
                <td className="p-3">{d.stage}</td>
                <td className="p-3 text-center">{d.cadReady ? "Yes" : "No"}</td>
                <td className="p-3 text-right">{d.daysInStage}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}
