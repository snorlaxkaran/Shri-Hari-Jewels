"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api/client";
import { downloadCsv } from "@/lib/reports/csv";

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
  const [lines, setLines] = useState<GstLine[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await api.get<{ lines: GstLine[] }>("/api/reports/gst");
        setLines(data.lines ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const exportCsv = () => {
    downloadCsv(
      "gst-report.csv",
      ["Item Code", "Product", "Customer", "List Price", "Discount", "Taxable Value", "Sold At"],
      lines.map((l) => [
        l.itemCode,
        l.productName,
        l.customerName,
        l.listPrice,
        l.discount,
        l.taxableValue,
        l.soldAt,
      ]),
    );
  };

  if (loading) return <p className="p-6">Loading GST report…</p>;

  return (
    <div className="page-content space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">GST Report</h1>
        <button type="button" className="btn-primary" onClick={exportCsv}>
          Export CSV
        </button>
      </div>
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
              <tr key={l.itemCode + l.soldAt} className="border-b" style={{ borderColor: "var(--border)" }}>
                <td className="p-3">{l.itemCode} — {l.productName}</td>
                <td className="p-3">{l.customerName}</td>
                <td className="p-3 text-right">₹{l.taxableValue.toLocaleString()}</td>
                <td className="p-3">{new Date(l.soldAt).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
