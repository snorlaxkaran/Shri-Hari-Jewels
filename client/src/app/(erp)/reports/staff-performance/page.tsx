"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { downloadCsv } from "@/lib/reports/csv";

export default function StaffPerformanceReportPage() {
  const [staff, setStaff] = useState<Array<{ name: string; salesCount: number; revenue: number }>>([]);

  useEffect(() => {
    void api.get("/api/reports/staff-performance").then((r) => setStaff(r.data.staff ?? []));
  }, []);

  return (
    <div className="page-content space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Staff Performance</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            downloadCsv(
              "staff-performance.csv",
              ["Staff", "Sales Count", "Revenue"],
              staff.map((s) => [s.name, s.salesCount, s.revenue]),
            )
          }
        >
          Export CSV
        </button>
      </div>
      <ul className="space-y-2">
        {staff.map((s) => (
          <li key={s.name} className="surface-card p-3 rounded-lg flex justify-between">
            <span>{s.name}</span>
            <span>{s.salesCount} sales · ₹{s.revenue.toLocaleString()}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
