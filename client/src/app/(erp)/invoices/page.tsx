"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import FilterPill from "@/app/(components)/ui/FilterPill";
import { fetchInvoices, openInvoicePdf } from "@/lib/api/invoices";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Invoice } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { Download } from "lucide-react";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const statuses = ["All", "Paid", "Pending"];

  const handleDownload = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      await openInvoicePdf(inv.id, `${inv.invoiceNo}.pdf`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not download invoice PDF."));
    } finally {
      setDownloadingId(null);
    }
  };

  useEffect(() => {
    fetchInvoices()
      .then(setInvoices)
      .catch(() => setError("Could not load invoices. Is the backend running?"))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(
    () =>
      statusFilter === "All"
        ? invoices
        : invoices.filter((i) => i.status === statusFilter),
    [invoices, statusFilter],
  );

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Invoices"
        subtitle={`${filtered.length} invoices from completed sales`}
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

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
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            No invoices yet. Complete a sale to generate one automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500">
                  <th className="text-left px-5 py-3 font-medium">Invoice</th>
                  <th className="text-left px-5 py-3 font-medium">Customer</th>
                  <th className="text-left px-5 py-3 font-medium">Product</th>
                  <th className="text-left px-5 py-3 font-medium">Amount</th>
                  <th className="text-left px-5 py-3 font-medium">Payment</th>
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
                    <td className="px-5 py-3">
                      <p>{inv.customerName}</p>
                      <p className="text-xs text-zinc-400">{inv.customerMobile}</p>
                    </td>
                    <td className="px-5 py-3">
                      <p className="text-xs font-mono">{inv.itemCode}</p>
                      <p className="text-xs text-zinc-500">{inv.productName}</p>
                    </td>
                    <td className="px-5 py-3">{formatCurrency(inv.total)}</td>
                    <td className="px-5 py-3">{inv.paymentMode}</td>
                    <td className="px-5 py-3">
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="px-5 py-3">{formatDate(inv.createdAt)}</td>
                    <td className="px-5 py-3">
                      <button
                        type="button"
                        onClick={() => handleDownload(inv)}
                        disabled={downloadingId === inv.id}
                        className="inline-flex p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 disabled:opacity-50"
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
        )}
      </div>
    </div>
  );
}
