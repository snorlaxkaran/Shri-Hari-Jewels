"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReport } from "@/lib/api/reports";
import ReportShell, { defaultMonthRange } from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type CategoryRow = {
  category: string;
  salesCount: number;
  revenue: number;
  stockUnits: number;
  stockValue: number;
};

export default function CategoryReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const range = defaultMonthRange();
    return { from: range.from, to: range.to };
  });
  const [rows, setRows] = useState<CategoryRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReport<{ rows: CategoryRow[] }>("category", filters);
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
      title="Category Report"
      reportKey="category"
      filters={["branch", "category", "department", "dateRange"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: "Category Report",
        filename: "category-report",
        headers: ["Category", "Sales", "Revenue", "Stock Units", "Stock Value"],
        rows: rows.map((r) => [r.category, r.salesCount, r.revenue, r.stockUnits, r.stockValue]),
      }}
    >
      <div className="overflow-x-auto surface-card rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left p-3">Category</th>
              <th className="text-right p-3">Sales</th>
              <th className="text-right p-3">Revenue</th>
              <th className="text-right p-3">Stock Units</th>
              <th className="text-right p-3">Stock Value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.category} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="p-3 font-medium">{r.category}</td>
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
