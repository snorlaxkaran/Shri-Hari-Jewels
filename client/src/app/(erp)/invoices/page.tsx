"use client";

import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatusBadge from "@/app/(components)/StatusBadge";
import { fetchInvoices, openInvoicePdf } from "@/lib/api/invoices";
import { getApiErrorMessage } from "@/lib/api/client";
import { preparePdfViewerTab } from "@/lib/open-pdf";
import type { Invoice } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [openingId, setOpeningId] = useState<string | null>(null);
  const statuses = ["All", "Paid", "Pending"];

  const handleOpen = (inv: Invoice) => {
    const tab = preparePdfViewerTab();
    setOpeningId(inv.id);
    setError("");

    void openInvoicePdf(inv.id, `${inv.invoiceNo}.pdf`, tab).catch((err) => {
      tab?.close();
      setError(getApiErrorMessage(err, "Could not open invoice PDF."));
    }).finally(() => {
      setOpeningId(null);
    });
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
        <span className="filter-count">{filtered.length} invoices</span>
      </div>

      <div className="data-table-wrap">
        {filtered.length === 0 ? (
          <p className="py-8 text-sm text-zinc-400 text-center">
            No invoices yet. Complete a sale to generate one automatically.
          </p>
        ) : (
          <table className="data-table">
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th>Items</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th aria-label="PDF" />
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
                    <td className="td-num">
                      {inv.itemCount}
                      {inv.itemCount === 1 && inv.items[0] ? (
                        <p className="text-xs td-muted font-normal mt-0.5">
                          {inv.items[0].itemCode}
                        </p>
                      ) : null}
                    </td>
                    <td className="td-num">{formatCurrency(inv.total)}</td>
                    <td className="td-muted">{inv.paymentMode}</td>
                    <td>
                      <StatusBadge status={inv.status} />
                    </td>
                    <td className="td-muted">{formatDate(inv.createdAt)}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => handleOpen(inv)}
                        disabled={openingId === inv.id}
                        className="row-action-btn"
                        aria-label={`Open PDF for ${inv.invoiceNo}`}
                        title="Open PDF"
                      >
                        {openingId === inv.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <FileText size={16} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
        )}
      </div>
    </div>
  );
}
