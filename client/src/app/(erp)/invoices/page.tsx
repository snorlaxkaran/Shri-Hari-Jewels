"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Loader2 } from "lucide-react";
import ListPageShell from "@/app/(components)/ListPageShell";
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
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpening, setBulkOpening] = useState(false);
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

  const handleBulkOpen = async () => {
    const ids = filtered.filter((inv) => selected.has(inv.id));
    if (ids.length === 0) return;

    setBulkOpening(true);
    setError("");
    for (const inv of ids) {
      const tab = preparePdfViewerTab();
      try {
        await openInvoicePdf(inv.id, `${inv.invoiceNo}.pdf`, tab);
      } catch (err) {
        tab?.close();
        setError(getApiErrorMessage(err, "Could not open one or more invoice PDFs."));
        break;
      }
    }
    setBulkOpening(false);
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

  const allSelected =
    filtered.length > 0 && filtered.every((inv) => selected.has(inv.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelected(new Set());
      return;
    }
    setSelected(new Set(filtered.map((inv) => inv.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <ListPageShell
      title="Invoices"
      subtitle={`${filtered.length} invoices from completed sales`}
      loading={loading}
      error={error || null}
      filterValue={statusFilter}
      filterOptions={statuses.map((s) => ({
        value: s,
        label: s === "All" ? "All statuses" : s,
      }))}
      onFilterChange={setStatusFilter}
      countLabel={`${filtered.length} invoices`}
      selectedCount={selected.size}
      isEmpty={filtered.length === 0}
      emptyMessage="No invoices yet. Complete a sale to generate one automatically."
      bulkActions={
        <>
          <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
            {selected.size} selected
          </span>
          <button
            type="button"
            className="btn-secondary"
            disabled={bulkOpening}
            onClick={() => void handleBulkOpen()}
          >
            {bulkOpening ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <FileText size={14} />
            )}
            Open PDFs
          </button>
        </>
      }
    >
      <div className="data-table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th className="col-checkbox">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  aria-label="Select all invoices"
                />
              </th>
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
                <td className="col-checkbox">
                  <input
                    type="checkbox"
                    checked={selected.has(inv.id)}
                    onChange={() => toggleOne(inv.id)}
                    aria-label={`Select ${inv.invoiceNo}`}
                  />
                </td>
                <td className="td-code">
                  <Link href={`/invoices/${inv.id}`} className="hover:underline">
                    {inv.invoiceNo}
                  </Link>
                </td>
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
      </div>
    </ListPageShell>
  );
}
