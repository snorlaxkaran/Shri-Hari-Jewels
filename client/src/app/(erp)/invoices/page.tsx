"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import RowActionsDropdown from "@/app/(components)/RowActionsDropdown";
import { fetchInvoices, openInvoicePdf } from "@/lib/api/invoices";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Invoice } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

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
    <div className="page-content">
      <PageHeader
        title="Invoices"
        subtitle={`${filtered.length} invoices from completed sales`}
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="filter-bar">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="filter-select"
        >
          {statuses.map((s) => (
            <option key={s} value={s}>
              {s === "All" ? "All statuses" : s}
            </option>
          ))}
        </select>
        <span className="filter-count">
          Showing {filtered.length} of {invoices.length}
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-5 py-8 text-sm text-zinc-400 text-center">
            No invoices yet. Complete a sale to generate one automatically.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Product</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((inv) => (
                  <tr key={inv.id}>
                    <td className="td-code">{inv.invoiceNo}</td>
                    <td className="td-muted">
                      <p>{inv.customerName}</p>
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {inv.customerMobile}
                      </p>
                    </td>
                    <td className="td-mono">
                      <p>{inv.itemCode}</p>
                      <p className="text-xs" style={{ color: "var(--text-secondary)" }}>
                        {inv.productName}
                      </p>
                    </td>
                    <td className="td-num">{formatCurrency(inv.total)}</td>
                    <td className="td-muted">{inv.paymentMode}</td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="td-muted">{formatDate(inv.createdAt)}</td>
                    <td className="text-right">
                      <RowActionsDropdown
                        actions={[
                          {
                            label:
                              downloadingId === inv.id
                                ? "Downloading…"
                                : "Download PDF",
                            onClick: () => void handleDownload(inv),
                          },
                        ]}
                      />
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
