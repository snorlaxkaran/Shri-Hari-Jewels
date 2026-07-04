"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Download, Pencil, Search } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import TransferTabs from "@/app/(components)/stock-transfer/TransferTabs";
import {
  fetchProformaTransfers,
  redownloadTransferInvoice,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
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
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

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

  const handleDownload = async (
    event: React.MouseEvent,
    transfer: StockTransfer,
  ) => {
    event.stopPropagation();
    setDownloadingId(transfer.id);
    setError("");
    try {
      await redownloadTransferInvoice(transfer.id);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to download invoice."));
    } finally {
      setDownloadingId(null);
    }
  };

  const handleEdit = (event: React.MouseEvent, transferId: string) => {
    event.stopPropagation();
    router.push(`/stock-transfer/sent/${transferId}`);
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
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

      <div className="flex flex-col gap-3 mb-4 lg:flex-row lg:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search transfer no., invoice no., customer, branch, item code..."
            className="input-field w-full pl-9 pr-4 py-2 text-sm"
          />
        </div>
        <select
          value={documentTypeFilter}
          onChange={(event) =>
            setDocumentTypeFilter(event.target.value as DocumentTypeFilter)
          }
          className="input-field px-3 py-2 text-sm"
        >
          <option value="All Types">All Types</option>
          <option value="Wholesale GST Invoice">Wholesale GST Invoice</option>
          <option value="Delivery Challan">Delivery Challan</option>
        </select>
        <select
          value={invoiceFilter}
          onChange={(event) =>
            setInvoiceFilter(event.target.value as InvoiceFilter)
          }
          className="input-field px-3 py-2 text-sm"
        >
          <option value="All">Invoice Generated: All</option>
          <option value="Yes">Invoice Generated: Yes</option>
          <option value="No">Invoice Generated: No</option>
        </select>
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs text-zinc-500">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={(event) => setDateFrom(event.target.value)}
            className="input-field px-3 py-2 text-sm"
          />
          <label className="text-xs text-zinc-500">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={(event) => setDateTo(event.target.value)}
            className="input-field px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500">
                <th className="text-left px-5 py-3 font-medium">Transfer No.</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Customer</th>
                <th className="text-left px-5 py-3 font-medium">Document Type</th>
                <th className="text-left px-5 py-3 font-medium">Items</th>
                <th className="text-left px-5 py-3 font-medium">Total Value</th>
                <th className="text-left px-5 py-3 font-medium">
                  Invoice Generated
                </th>
                <th className="text-left px-5 py-3 font-medium">Invoice No.</th>
                <th className="text-left px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-5 py-10 text-center text-sm text-zinc-400"
                  >
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
                      className="border-t border-zinc-100 text-zinc-900 cursor-pointer hover:bg-zinc-50/80"
                    >
                      <td className="px-5 py-3 font-mono text-xs">
                        {transfer.transferNo}
                      </td>
                      <td className="px-5 py-3">
                        {formatDate(transfer.createdAt)}
                      </td>
                      <td className="px-5 py-3">
                        <span className="block text-zinc-900">
                          {transfer.customerName ?? transfer.toBranchName}
                        </span>
                        {transfer.customerBranchName && (
                          <span className="text-xs text-zinc-400">
                            {transfer.customerBranchName}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3">{transfer.documentType}</td>
                      <td className="px-5 py-3">{transfer.itemCount}</td>
                      <td className="px-5 py-3">
                        {formatCurrency(transfer.totalValue)}
                      </td>
                      <td className="px-5 py-3">
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
                      <td className="px-5 py-3 font-mono text-xs">
                        {transfer.invoiceNo ?? "—"}
                      </td>
                      <td className="px-5 py-3">
                        {canAct && (
                          <div className="flex items-center gap-1">
                            {generated && (
                              <button
                                type="button"
                                title="Download PDF"
                                disabled={downloadingId === transfer.id}
                                onClick={(event) =>
                                  handleDownload(event, transfer)
                                }
                                className="p-1.5 text-zinc-400 hover:text-emerald-600 disabled:opacity-50"
                              >
                                <Download size={15} />
                              </button>
                            )}
                            <button
                              type="button"
                              title={
                                generated
                                  ? "Edit & Re-generate"
                                  : "Edit & Generate Invoice"
                              }
                              onClick={(event) =>
                                handleEdit(event, transfer.id)
                              }
                              className={`p-1.5 ${
                                generated
                                  ? "text-zinc-400 hover:text-zinc-700"
                                  : "text-zinc-400 hover:text-amber-600"
                              }`}
                            >
                              <Pencil size={15} />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-sm text-zinc-500">
        Showing {filtered.length} of {transfers.length} transfer
        {transfers.length === 1 ? "" : "s"} · Total Value:{" "}
        {formatCurrency(filteredTotalValue)} · {filteredInvoiced} invoiced ·{" "}
        {filteredPending} pending
      </p>
    </div>
  );
}
