"use client";

import { useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import StatusBadge from "@/app/(components)/StatusBadge";
import FilterPill from "@/app/(components)/ui/FilterPill";
import { invoices } from "@/lib/mock-data";
import { formatCurrency, formatDate } from "@/lib/format";
import { Download, Plus } from "lucide-react";

export default function InvoicesPage() {
  const [statusFilter, setStatusFilter] = useState("All");
  const statuses = ["All", "Paid", "Due", "Overdue"];

  const filtered = useMemo(
    () =>
      statusFilter === "All"
        ? invoices
        : invoices.filter((i) => i.status === statusFilter),
    [statusFilter],
  );

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${filtered.length} invoices`}
        action={
          <button className="btn-primary flex items-center gap-2 px-4 py-2 text-sm">
            <Plus size={16} />
            Create Invoice
          </button>
        }
      />

      <div className="flex gap-2 mb-4 flex-wrap">
        {statuses.map((s) => (
          <FilterPill
            key={s}
            label={s}
            active={statusFilter === s}
            onClick={() => setStatusFilter(s)}
          />
        ))}
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500">
                <th className="text-left px-5 py-3 font-medium">Invoice</th>
                <th className="text-left px-5 py-3 font-medium">Customer</th>
                <th className="text-left px-5 py-3 font-medium">Amount</th>
                <th className="text-left px-5 py-3 font-medium">GST</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((inv) => (
                <tr
                  key={inv.id}
                  className="border-t border-zinc-100 text-zinc-900 hover:bg-zinc-50 transition-colors"
                >
                  <td className="px-5 py-3 font-medium">{inv.invoiceNo}</td>
                  <td className="px-5 py-3">{inv.customerName}</td>
                  <td className="px-5 py-3">{formatCurrency(inv.amount)}</td>
                  <td className="px-5 py-3">{formatCurrency(inv.gst)}</td>
                  <td className="px-5 py-3">
                    <StatusBadge status={inv.status} />
                  </td>
                  <td className="px-5 py-3">{formatDate(inv.date)}</td>
                  <td className="px-5 py-3">
                    <button
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100"
                      aria-label="Download invoice"
                    >
                      <Download size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
