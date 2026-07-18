"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import ReportShell, { defaultMonthRange } from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type GstLine = {
  itemCode: string;
  productName: string;
  customerName: string;
  listPrice: number;
  discount: number;
  taxableValue: number;
  soldAt: string;
};

export default function GstReportPage() {
  const [filters, setFilters] = useState<ReportFilters>(() => {
    const range = defaultMonthRange();
    return { from: range.from, to: range.to };
  });
  const [lines, setLines] = useState<GstLine[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ lines: GstLine[] }>("/api/reports/gst", {
        params: {
          from: filters.from,
          to: filters.to,
          branchId: filters.branchId,
          category: filters.category,
          department: filters.department,
          customerId: filters.customerId,
        },
      });
      setLines(data.lines ?? []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ReportShell
      title="GST Report"
      reportKey="gst"
      filters={["branch", "category", "department", "customer", "dateRange"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: "GST Report",
        filename: "gst-report",
        headers: ["Item Code", "Product", "Customer", "List Price", "Discount", "Taxable Value", "Sold At"],
        rows: lines.map((l) => [
          l.itemCode,
          l.productName,
          l.customerName,
          l.listPrice,
          l.discount,
          l.taxableValue,
          new Date(l.soldAt).toLocaleDateString(),
        ]),
      }}
    >
      <div className="overflow-x-auto surface-card rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left p-3">Item</th>
              <th className="text-left p-3">Customer</th>
              <th className="text-right p-3">Taxable</th>
              <th className="text-left p-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((l) => (
              <tr
                key={l.itemCode + l.soldAt}
                className="border-b"
                style={{ borderColor: "var(--border)" }}
              >
                <td className="p-3">
                  {l.itemCode} — {l.productName}
                </td>
                <td className="p-3">{l.customerName}</td>
                <td className="p-3 text-right">₹{l.taxableValue.toLocaleString()}</td>
                <td className="p-3">{new Date(l.soldAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}
