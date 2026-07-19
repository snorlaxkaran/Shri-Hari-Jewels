"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, FileText, Loader2, Pencil } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import TransferTabs from "@/app/(components)/stock-transfer/TransferTabs";
import TransferStatusBadge from "@/app/(components)/stock-transfer/TransferStatusBadge";
import {
  fetchProformaTransfers,
  openTransferInvoicePdf,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { preparePdfViewerTab } from "@/lib/open-pdf";
import { canManageStockTransfers } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import type { StockTransfer, StockTransferDocumentType } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

type DocumentTypeFilter = "All Types" | StockTransferDocumentType;
type InvoiceFilter = "All" | "Yes" | "No";

const isInvoiceGenerated = (transfer: StockTransfer): boolean =>
  Boolean(transfer.invoiceNo) || Boolean(transfer.invoicedAt);

const matchesSearch = (transfer: StockTransfer, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const branchLabel =
    transfer.customerBranchName ?? transfer.toBranchName ?? "";

  if (transfer.transferNo.toLowerCase().includes(q)) return true;
  if (transfer.invoiceNo?.toLowerCase().includes(q)) return true;
  if (transfer.customerName?.toLowerCase().includes(q)) return true;
  if (branchLabel.toLowerCase().includes(q)) return true;
  if (
    transfer.items.some((item) => item.itemCode.toLowerCase().includes(q))
  ) {
    return true;
  }

  return false;
};

export default function ProformaListPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canAct = user ? canManageStockTransfers(user.role) : false;

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [documentTypeFilter, setDocumentTypeFilter] =
    useState<DocumentTypeFilter>("All Types");
  const [invoiceFilter, setInvoiceFilter] = useState<InvoiceFilter>("All");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [openingId, setOpeningId] = useState<string | null>(null);

  useEffect(() => {
    fetchProformaTransfers()
      .then(setTransfers)
      .catch((err) =>
        setError(getApiErrorMessage(err, "Could not load transfers.")),
      )
      .finally(() => setLoading(false));
  }, []);

  const invoicedCount = useMemo(
    () => transfers.filter(isInvoiceGenerated).length,
    [transfers],
  );
  const pendingCount = transfers.length - invoicedCount;

  const hasActiveFilters =
    search.trim().length > 0 ||
    documentTypeFilter !== "All Types" ||
    invoiceFilter !== "All" ||
    dateFrom.length > 0 ||
    dateTo.length > 0;

  const filtered = useMemo(() => {
    return transfers.filter((transfer) => {
      if (!matchesSearch(transfer, search)) return false;

      if (
        documentTypeFilter !== "All Types" &&
        transfer.documentType !== documentTypeFilter
      ) {
        return false;
      }

      const generated = isInvoiceGenerated(transfer);
      if (invoiceFilter === "Yes" && !generated) return false;
      if (invoiceFilter === "No" && generated) return false;

      if (dateFrom) {
        const from = new Date(`${dateFrom}T00:00:00`);
        if (new Date(transfer.createdAt) < from) return false;
      }
      if (dateTo) {
        const to = new Date(`${dateTo}T23:59:59.999`);
        if (new Date(transfer.createdAt) > to) return false;
      }

      return true;
    });
  }, [transfers, search, documentTypeFilter, invoiceFilter, dateFrom, dateTo]);

  const filteredInvoiced = filtered.filter(isInvoiceGenerated).length;
  const filteredPending = filtered.length - filteredInvoiced;
  const filteredTotalValue = filtered.reduce(
    (sum, transfer) => sum + transfer.totalValue,
    0,
  );

  const handleRowClick = (transferId: string) => {
    router.push(`/stock-transfer/sent/${transferId}`);
  };

  const handleOpenPdf = (transfer: StockTransfer, event?: React.MouseEvent) => {
    event?.stopPropagation();
    if (openingId === transfer.id) return;
    const tab = preparePdfViewerTab();
    setOpeningId(transfer.id);
    setError("");
    void openTransferInvoicePdf(transfer.id, tab)
      .catch((err) => {
        tab?.close();
        setError(getApiErrorMessage(err, "Failed to open document."));
      })
      .finally(() => setOpeningId(null));
  };

  const handleEdit = (transferId: string, event?: React.MouseEvent) => {
    event?.stopPropagation();
    router.push(`/stock-transfer/sent/${transferId}`);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Proforma & Invoice List"
        subtitle={`${transfers.length} transfer${transfers.length === 1 ? "" : "s"} · ${invoicedCount} invoiced · ${pendingCount} pending`}
        action={
          <Link
            href="/stock-transfer"
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <ArrowRightLeft size={16} />
            Scan &amp; Send
          </Link>
        }
      />

      <TransferTabs />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="filter-bar">
        <div className="filter-search">
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transfer no., invoice no., customer, branch, item code..."
          />
        </div>
        <select
          value={documentTypeFilter}
          onChange={(event) =>
            setDocumentTypeFilter(event.target.value as DocumentTypeFilter)
          }
          className="filter-select"
        >
          <option value="All Types">All Types</option>
          <option value="Wholesale GST Invoice">Wholesale GST Invoice</option>
          <option value="Delivery Challan">Delivery Challan</option>
          <option value="Stock Transfer Note">Stock Transfer Note</option>
        </select>
        <select
          value={invoiceFilter}
          onChange={(event) =>
            setInvoiceFilter(event.target.value as InvoiceFilter)
          }
          className="filter-select"
        >
          <option value="All">Invoice Generated: All</option>
          <option value="Yes">Invoice Generated: Yes</option>
          <option value="No">Invoice Generated: No</option>
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(event) => setDateFrom(event.target.value)}
          className="filter-select"
          aria-label="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(event) => setDateTo(event.target.value)}
          className="filter-select"
          aria-label="To date"
        />
        <span className="filter-count">{filtered.length} transfers</span>
      </div>

      <div className="data-table-wrap">
          <table className="data-table min-w-[1000px]">
            <thead>
              <tr>
                <th>Transfer No.</th>
                <th>Date</th>
                <th>Customer</th>
                <th>Document Type</th>
                <th>Items</th>
                <th>Total Value</th>
                <th>Status</th>
                <th>Invoice Generated</th>
                <th>Invoice No.</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center td-muted py-10">
                    {transfers.length === 0
                      ? "No transfers yet. Use Scan & Send to transfer stock to a customer branch."
                      : hasActiveFilters
                        ? "No transfers match your filters."
                        : "No transfers yet. Use Scan & Send to transfer stock to a customer branch."}
                  </td>
                </tr>
              ) : (
                filtered.map((transfer) => {
                  const generated = isInvoiceGenerated(transfer);
                  return (
                    <tr
                      key={transfer.id}
                      onClick={() => handleRowClick(transfer.id)}
                    >
                      <td className="td-code">{transfer.transferNo}</td>
                      <td className="td-muted">
                        {formatDate(transfer.createdAt)}
                      </td>
                      <td>
                        <span className="block">
                          {transfer.customerName ?? transfer.toBranchName}
                        </span>
                        {transfer.customerBranchName && (
                          <span className="text-xs td-muted">
                            {transfer.customerBranchName}
                          </span>
                        )}
                      </td>
                      <td className="td-muted">{transfer.documentType}</td>
                      <td className="td-num">{transfer.itemCount}</td>
                      <td className="td-num">
                        {formatCurrency(transfer.totalValue)}
                      </td>
                      <td>
                        <TransferStatusBadge status={transfer.status} />
                      </td>
                      <td>
                        {generated ? (
                          <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                            Yes
                          </span>
                        ) : (
                          <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                            No
                          </span>
                        )}
                      </td>
                      <td className="td-mono">{transfer.invoiceNo ?? "—"}</td>
                      <td className="text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {generated ? (
                            <button
                              type="button"
                              onClick={(event) => handleOpenPdf(transfer, event)}
                              disabled={openingId === transfer.id}
                              className="row-action-btn"
                              aria-label={`Open PDF for ${transfer.transferNo}`}
                              title="Open PDF"
                            >
                              {openingId === transfer.id ? (
                                <Loader2 size={16} className="animate-spin" />
                              ) : (
                                <FileText size={16} />
                              )}
                            </button>
                          ) : null}
                          {canAct ? (
                            <button
                              type="button"
                              onClick={(event) => handleEdit(transfer.id, event)}
                              className="row-action-btn"
                              aria-label={
                                generated
                                  ? `Edit ${transfer.transferNo}`
                                  : `Generate invoice for ${transfer.transferNo}`
                              }
                              title={generated ? "Edit & re-generate" : "Edit & generate"}
                            >
                              <Pencil size={16} />
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
      </div>

      <p className="mt-4 text-sm text-zinc-500">
        Total Value:{" "}
        {formatCurrency(filteredTotalValue)} · {filteredInvoiced} invoiced ·{" "}
        {filteredPending} pending
      </p>
    </div>
  );
}
