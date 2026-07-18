"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import ReportShell, { defaultMonthRange } from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type StaffRow = { name: string; salesCount: number; revenue: number };

export default function StaffPerformanceReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const range = defaultMonthRange();
    return { from: range.from, to: range.to };
  });
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ staff: StaffRow[] }>("/api/reports/staff-performance", {
        params: {
          from: filters.from,
          to: filters.to,
          branchId: filters.branchId,
          category: filters.category,
          department: filters.department,
        },
      });
      setStaff(data.staff ?? []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ReportShell
      title="Staff Performance"
      reportKey="staff-performance"
      filters={["branch", "category", "department", "dateRange"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: "Staff Performance",
        filename: "staff-performance",
        headers: ["Staff", "Sales Count", "Revenue"],
        rows: staff.map((s) => [s.name, s.salesCount, s.revenue]),
      }}
    >
      <ul className="space-y-2">
        {staff.map((s) => (
          <li key={s.name} className="surface-card p-3 rounded-lg flex justify-between">
            <span>{s.name}</span>
            <span>
              {s.salesCount} sales · ₹{s.revenue.toLocaleString()}
            </span>
          </li>
        ))}
        {!loading && staff.length === 0 && (
          <p className="text-sm text-zinc-400">No sales in this period.</p>
        )}
      </ul>
    </ReportShell>
  );
}
