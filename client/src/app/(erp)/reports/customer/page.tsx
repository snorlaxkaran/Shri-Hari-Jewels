"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReport } from "@/lib/api/reports";
import ReportShell, { defaultMonthRange } from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type CustomerRow = {
  customerId: string | null;
  customerName: string;
  customerPhone: string;
  purchaseCount: number;
  totalSpend: number;
  lastVisit: string;
};

export default function CustomerReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const range = defaultMonthRange();
    return { from: range.from, to: range.to };
  });
  const [customers, setCustomers] = useState<CustomerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReport<{ customers: CustomerRow[] }>("customer", filters);
      setCustomers(data.customers ?? []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ReportShell
      title="Customer Report"
      reportKey="customer"
      filters={["branch", "category", "department", "customer", "dateRange"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: "Customer Report",
        filename: "customer-report",
        headers: ["Customer", "Mobile", "Purchases", "Total Spend", "Last Visit"],
        rows: customers.map((c) => [
          c.customerName,
          c.customerPhone,
          c.purchaseCount,
          c.totalSpend,
          new Date(c.lastVisit).toLocaleDateString(),
        ]),
      }}
    >
      <div className="overflow-x-auto surface-card rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left p-3">Customer</th>
              <th className="text-left p-3">Mobile</th>
              <th className="text-right p-3">Purchases</th>
              <th className="text-right p-3">Total Spend</th>
              <th className="text-left p-3">Last Visit</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr
                key={c.customerId ?? c.customerPhone}
                className="border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="p-3 font-medium">{c.customerName}</td>
                <td className="p-3">{c.customerPhone}</td>
                <td className="p-3 text-right">{c.purchaseCount}</td>
                <td className="p-3 text-right">₹{c.totalSpend.toLocaleString()}</td>
                <td className="p-3">{new Date(c.lastVisit).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}
