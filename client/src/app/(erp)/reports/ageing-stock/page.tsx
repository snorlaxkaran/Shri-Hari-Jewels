"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import ReportShell from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type AgeingItem = {
  itemCode: string;
  productName: string;
  daysInStock: number;
  price: number;
  category: string;
};

export default function AgeingStockReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [items, setItems] = useState<AgeingItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<{ items: AgeingItem[] }>("/api/reports/ageing-stock", {
        params: {
          minDays: 90,
          branchId: filters.branchId,
          category: filters.category,
          department: filters.department,
        },
      });
      setItems(data.items ?? []);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <ReportShell
      title="Ageing Stock (90+ days)"
      reportKey="ageing-stock"
      filters={["branch", "category", "department"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: "Ageing Stock",
        filename: "ageing-stock",
        headers: ["Item Code", "Product", "Category", "Days", "Price"],
        rows: items.map((i) => [i.itemCode, i.productName, i.category, i.daysInStock, i.price]),
      }}
    >
      <p className="text-sm text-zinc-600 mb-2">{items.length} items unsold for 90+ days</p>
      <ul className="space-y-2">
        {items.map((i) => (
          <li key={i.itemCode} className="surface-card p-3 rounded-lg flex justify-between text-sm">
            <span>
              {i.itemCode} — {i.productName}
            </span>
            <span>
              {i.daysInStock} days · ₹{i.price.toLocaleString()}
            </span>
          </li>
        ))}
      </ul>
    </ReportShell>
  );
}
