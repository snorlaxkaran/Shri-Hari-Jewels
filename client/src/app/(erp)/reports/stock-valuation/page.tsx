"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { downloadCsv } from "@/lib/reports/csv";

export default function StockValuationReportPage() {
  const [data, setData] = useState<{ totalValue: number; products: Array<{ sku: string; name: string; stock: number; totalValue: number }> } | null>(null);

  useEffect(() => {
    void api.get("/api/reports/stock-valuation").then((r) => setData(r.data));
  }, []);

  if (!data) return <p className="p-6">Loading…</p>;

  return (
    <div className="page-content space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Stock Valuation</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            downloadCsv(
              "stock-valuation.csv",
              ["SKU", "Name", "Stock", "Total Value"],
              data.products.map((p) => [p.sku, p.name, p.stock, p.totalValue]),
            )
          }
        >
          Export CSV
        </button>
      </div>
      <p>Total inventory value: ₹{data.totalValue.toLocaleString()}</p>
    </div>
  );
}
