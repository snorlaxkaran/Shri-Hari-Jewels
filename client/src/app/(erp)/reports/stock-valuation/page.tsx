"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import ReportShell from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type ValuationData = {
  totalValue: number;
  products: Array<{
    sku: string;
    name: string;
    category: string;
    metal: string;
    stock: number;
    unitPrice: number;
    totalValue: number;
  }>;
};

export default function StockValuationReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({});
  const [data, setData] = useState<ValuationData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data: report } = await api.get<ValuationData>("/api/reports/stock-valuation", {
        params: {
          branchId: filters.branchId,
          category: filters.category,
          department: filters.department,
        },
      });
      setData(report);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const products = data?.products ?? [];

  return (
    <ReportShell
      title="Stock Valuation"
      reportKey="stock-valuation"
      filters={["branch", "category", "department"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: "Stock Valuation",
        filename: "stock-valuation",
        headers: ["SKU", "Name", "Category", "Metal", "Stock", "Unit Price", "Total Value"],
        rows: products.map((p) => [
          p.sku,
          p.name,
          p.category,
          p.metal,
          p.stock,
          p.unitPrice,
          p.totalValue,
        ]),
      }}
    >
      {data && (
        <p className="text-sm font-medium mb-3">
          Total inventory value: ₹{data.totalValue.toLocaleString()}
        </p>
      )}
      <div className="overflow-x-auto surface-card rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              <th className="text-left p-3">SKU</th>
              <th className="text-left p-3">Product</th>
              <th className="text-right p-3">Stock</th>
              <th className="text-right p-3">Unit Price</th>
              <th className="text-right p-3">Value</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.sku} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="p-3 font-mono text-xs">{p.sku}</td>
                <td className="p-3">{p.name}</td>
                <td className="p-3 text-right">{p.stock}</td>
                <td className="p-3 text-right">₹{p.unitPrice.toLocaleString()}</td>
                <td className="p-3 text-right">₹{p.totalValue.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}
