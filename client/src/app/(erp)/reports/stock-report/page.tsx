"use client";

import { useCallback, useEffect, useState } from "react";
import { fetchReport } from "@/lib/api/reports";
import ReportShell from "@/lib/reports/ReportShell";
import type { ReportFilters } from "@/lib/reports/types";

type StockItem =
  | {
      itemCode: string;
      sku: string;
      name: string;
      category: string;
      metal: string;
      branchName: string;
      unitPrice: number;
    }
  | {
      sku: string;
      name: string;
      category: string;
      metal: string;
      branchName: string;
      stock: number;
      unitPrice: number;
      totalValue: number;
    };

type StockReport = {
  groupBySku: boolean;
  items: StockItem[];
  totalUnits: number;
  totalValue: number;
};

export default function StockReportPage() {
  const [filters, setFilters] = useState<ReportFilters>({ groupBySku: false });
  const [report, setReport] = useState<StockReport | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchReport<StockReport>("stock-report", filters);
      setReport(data);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    void load();
  }, [load]);

  const items = report?.items ?? [];
  const groupBySku = report?.groupBySku ?? filters.groupBySku;

  return (
    <ReportShell
      title="Stock Snapshot"
      reportKey="stock-report"
      filters={["branch", "category", "department", "groupBySku"]}
      filtersState={filters}
      onFiltersChange={setFilters}
      loading={loading}
      exportData={{
        title: groupBySku ? "Stock Snapshot (by SKU)" : "Stock Snapshot",
        filename: "stock-report",
        headers: groupBySku
          ? ["SKU", "Name", "Category", "Metal", "Branch", "Stock", "Value"]
          : ["Item Code", "SKU", "Name", "Category", "Metal", "Branch", "Price"],
        rows: groupBySku
          ? items.map((i) => {
              const row = i as Extract<StockItem, { stock: number }>;
              return [
                row.sku,
                row.name,
                row.category,
                row.metal,
                row.branchName,
                row.stock,
                row.totalValue,
              ];
            })
          : items.map((i) => {
              const row = i as Extract<StockItem, { itemCode: string }>;
              return [
                row.itemCode,
                row.sku,
                row.name,
                row.category,
                row.metal,
                row.branchName,
                row.unitPrice,
              ];
            }),
      }}
    >
      {report && (
        <p className="text-sm font-medium mb-3">
          {report.totalUnits} units · ₹{report.totalValue.toLocaleString()} total value
        </p>
      )}
      <div className="overflow-x-auto surface-card rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b" style={{ borderColor: "var(--border)" }}>
              {!groupBySku && <th className="text-left p-3">Item Code</th>}
              <th className="text-left p-3">SKU</th>
              <th className="text-left p-3">Name</th>
              <th className="text-left p-3">Branch</th>
              {groupBySku ? (
                <>
                  <th className="text-right p-3">Stock</th>
                  <th className="text-right p-3">Value</th>
                </>
              ) : (
                <th className="text-right p-3">Price</th>
              )}
            </tr>
          </thead>
          <tbody>
            {groupBySku
              ? items.map((i) => {
                  const row = i as Extract<StockItem, { stock: number }>;
                  return (
                    <tr key={row.sku + row.branchName} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="p-3 font-mono text-xs">{row.sku}</td>
                      <td className="p-3">{row.name}</td>
                      <td className="p-3">{row.branchName}</td>
                      <td className="p-3 text-right">{row.stock}</td>
                      <td className="p-3 text-right">₹{row.totalValue.toLocaleString()}</td>
                    </tr>
                  );
                })
              : items.map((i) => {
                  const row = i as Extract<StockItem, { itemCode: string }>;
                  return (
                    <tr key={row.itemCode} className="border-b" style={{ borderColor: "var(--border)" }}>
                      <td className="p-3 font-mono text-xs">{row.itemCode}</td>
                      <td className="p-3 font-mono text-xs">{row.sku}</td>
                      <td className="p-3">{row.name}</td>
                      <td className="p-3">{row.branchName}</td>
                      <td className="p-3 text-right">₹{row.unitPrice.toLocaleString()}</td>
                    </tr>
                  );
                })}
          </tbody>
        </table>
      </div>
    </ReportShell>
  );
}
