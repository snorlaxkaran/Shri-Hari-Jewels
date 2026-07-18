"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReport } from "@/lib/api/reports";
import ReportShell, { defaultMonthRange } from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type BranchRow = {
  branchId: string;
  branchName: string;
  address: string | null;
  salesCount: number;
  revenue: number;
  stockUnits: number;
  stockValue: number;
};

export default function LocationWiseReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const range = defaultMonthRange();
    return { from: range.from, to: range.to };
  });
  const [branches, setBranches] = useState<BranchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReport<{ branches: BranchRow[] }>("location-wise", filters);
      setBranches(data.branches ?? []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ReportShell
      title="Location-wise Report"
      reportKey="location-wise"
      filters={["category", "department", "dateRange"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: "Location-wise Report",
        filename: "location-wise-report",
        headers: ["Branch", "Address", "Sales", "Revenue", "Stock Units", "Stock Value"],
        rows: branches.map((b) => [
          b.branchName,
          b.address ?? "",
          b.salesCount,
          b.revenue,
          b.stockUnits,
          b.stockValue,
        ]),
      }}
    >
      <div className="overflow-x-auto surface-card rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left p-3">Branch</th>
              <th className="text-left p-3">Address</th>
              <th className="text-right p-3">Sales</th>
              <th className="text-right p-3">Revenue</th>
              <th className="text-right p-3">Stock Units</th>
              <th className="text-right p-3">Stock Value</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((b) => (
              <tr key={b.branchId} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="p-3 font-medium">{b.branchName}</td>
                <td className="p-3">{b.address ?? "—"}</td>
                <td className="p-3 text-right">{b.salesCount}</td>
                <td className="p-3 text-right">₹{b.revenue.toLocaleString()}</td>
                <td className="p-3 text-right">{b.stockUnits}</td>
                <td className="p-3 text-right">₹{b.stockValue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}
