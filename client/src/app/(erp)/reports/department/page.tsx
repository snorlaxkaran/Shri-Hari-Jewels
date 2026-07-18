"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReport } from "@/lib/api/reports";
import ReportShell, { defaultMonthRange } from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type DepartmentRow = {
  department: string;
  salesCount: number;
  revenue: number;
  stockUnits: number;
  stockValue: number;
};

export default function DepartmentReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const range = defaultMonthRange();
    return { from: range.from, to: range.to };
  });
  const [rows, setRows] = useState<DepartmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReport<{ rows: DepartmentRow[] }>("department", filters);
      setRows(data.rows ?? []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ReportShell
      title="Department Report"
      reportKey="department"
      filters={["branch", "category", "department", "customer", "dateRange"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: "Department Report",
        filename: "department-report",
        headers: ["Department", "Sales", "Revenue", "Stock Units", "Stock Value"],
        rows: rows.map((r) => [r.department, r.salesCount, r.revenue, r.stockUnits, r.stockValue]),
      }}
    >
      <p className="text-xs text-zinc-500 mb-3">
        Department is grouped by metal type (Gold, Silver, etc.).
      </p>
      <div className="overflow-x-auto surface-card rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left p-3">Department</th>
              <th className="text-right p-3">Sales</th>
              <th className="text-right p-3">Revenue</th>
              <th className="text-right p-3">Stock Units</th>
              <th className="text-right p-3">Stock Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.department} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="p-3 font-medium">{r.department}</td>
                <td className="p-3 text-right">{r.salesCount}</td>
                <td className="p-3 text-right">₹{r.revenue.toLocaleString()}</td>
                <td className="p-3 text-right">{r.stockUnits}</td>
                <td className="p-3 text-right">₹{r.stockValue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}
