"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { downloadCsv } from "@/lib/reports/csv";

export default function AgeingStockReportPage() {
  const [items, setItems] = useState<Array<{ itemCode: string; productName: string; daysInStock: number; price: number }>>([]);

  useEffect(() => {
    void api.get("/api/reports/ageing-stock?minDays=90").then((r) => setItems(r.data.items ?? []));
  }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-xl font-semibold">Ageing Stock (90+ days)</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() =>
            downloadCsv(
              "ageing-stock.csv",
              ["Item Code", "Product", "Days", "Price"],
              items.map((i) => [i.itemCode, i.productName, i.daysInStock, i.price]),
            )
          }
        >
          Export CSV
        </button>
      </div>
      <p>{items.length} items unsold for 90+ days</p>
    </div>
  );
}
