"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, Download, Search } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import RowActionsDropdown from "@/app/(components)/RowActionsDropdown";
import TransferTabs from "@/app/(components)/stock-transfer/TransferTabs";
import { fetchSentStockTransfers, cancelStockTransfer } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { canManageStockTransfers } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import TransferStatusBadge from "@/app/(components)/stock-transfer/TransferStatusBadge";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";
import {
  downloadTransfersCsv,
} from "@/lib/inventory/export-transfer";
import type { StockTransfer } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export default function SentStockPage() {
  const router = useRouter();
  const { user } = useAuth();
  const canAct = user ? canManageStockTransfers(user.role) : false;
  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [storeFilter, setStoreFilter] = useState("All");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetchSentStockTransfers()
      .then(setTransfers)
      .catch((err) =>
        setError(getApiErrorMessage(err, "Could not load sent transfers.")),
      )
      .finally(() => setLoading(false));
  }, []);

  const stores = useMemo(() => {
    const names = [
      ...new Set(
        transfers.map((t) =>
          t.customerBranchName
            ? `${t.customerBranchName}${t.customerName ? ` (${t.customerName})` : ""}`
            : t.toBranchName,
        ),
      ),
    ].sort();
    return ["All", ...names];
  }, [transfers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const storeLabel = transfer.customerBranchName
        ? `${transfer.customerBranchName}${transfer.customerName ? ` (${transfer.customerName})` : ""}`
        : transfer.toBranchName;
      const matchesStore =
        storeFilter === "All" || storeLabel === storeFilter;
      const matchesSearch =
        !q ||
        transfer.transferNo.toLowerCase().includes(q) ||
        transfer.toBranchName.toLowerCase().includes(q) ||
        transfer.documentType.toLowerCase().includes(q) ||
        transfer.items.some(
          (item) =>
            item.itemCode.toLowerCase().includes(q) ||
            item.productName.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q),
        );
      return matchesStore && matchesSearch;
    });
  }, [transfers, search, storeFilter]);

  const totalItems = filtered.reduce((sum, t) => sum + t.itemCount, 0);
  const totalValue = filtered.reduce((sum, t) => sum + t.totalValue, 0);

  const handleCancel = async (transfer: StockTransfer) => {
    if (!confirm(`Cancel pending transfer ${transfer.transferNo}?`)) return;
    try {
      const updated = await cancelStockTransfer(transfer.id);
      setTransfers((prev) =>
        prev.map((t) => (t.id === updated.id ? updated : t)),
      );
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to cancel transfer."));
    }
  };

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Sent to Stores"
        subtitle={`${filtered.length} transfer${filtered.length === 1 ? "" : "s"} · ${totalItems} items · ${formatCurrency(totalValue)}`}
        action={
          <button
            type="button"
            onClick={() => downloadTransfersCsv(filtered)}
            disabled={filtered.length === 0}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            Download CSV
          </button>
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
          <Search size={14} className="text-zinc-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer no., store, item code, SKU..."
          />
        </div>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="filter-select"
        >
          {stores.map((store) => (
            <option key={store} value={store}>
              {store === "All" ? "All Stores" : store}
            </option>
          ))}
        </select>
        <span className="filter-count">
          Showing {filtered.length} of {transfers.length}
        </span>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th className="w-10" />
                <th>Transfer No.</th>
                <th>Date</th>
                <th>Store</th>
                <th>Document</th>
                <th>Invoice No.</th>
                <th>Items</th>
                <th>Value</th>
                <th>Status</th>
                <th>Sent By</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center td-muted py-10">
                    No transfers sent yet. Use Scan &amp; Send to transfer stock.
                  </td>
                </tr>
              ) : (
                filtered.map((transfer) => {
                  const expanded = expandedId === transfer.id;
                  return (
                    <Fragment key={transfer.id}>
                      <tr>
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId(expanded ? null : transfer.id)
                            }
                            className="p-1 text-zinc-400 hover:text-zinc-700"
                            aria-label={expanded ? "Collapse" : "Expand"}
                          >
                            {expanded ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </button>
                        </td>
                        <td className="td-code">{transfer.transferNo}</td>
                        <td className="td-muted">
                          {formatDate(transfer.transferDate)}
                        </td>
                        <td>
                          {transfer.customerBranchName ? (
                            <span>
                              <span className="block">
                                {transfer.customerBranchName}
                              </span>
                              {transfer.customerName && (
                                <span className="text-xs td-muted">
                                  {transfer.customerName}
                                </span>
                              )}
                            </span>
                          ) : (
                            transfer.toBranchName
                          )}
                        </td>
                        <td className="td-muted">{transfer.documentType}</td>
                        <td className="td-mono">{transfer.invoiceNo ?? "—"}</td>
                        <td className="td-num">{transfer.itemCount}</td>
                        <td className="td-num">
                          {formatCurrency(transfer.totalValue)}
                        </td>
                        <td>
                          <TransferStatusBadge status={transfer.status} />
                        </td>
                        <td className="td-muted">{transfer.createdByName}</td>
                        <td className="text-right">
                          <RowActionsDropdown
                            actions={[
                              {
                                label: "View / Invoice",
                                onClick: () =>
                                  router.push(
                                    `/stock-transfer/sent/${transfer.id}`,
                                  ),
                              },
                              {
                                label: "Cancel",
                                onClick: () => handleCancel(transfer),
                                destructive: true,
                                hidden:
                                  !canAct || transfer.status !== "Pending",
                              },
                            ]}
                          />
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-zinc-50/80">
                          <td colSpan={11} className="py-4">
                            <div className="mb-3 flex justify-end">
                              <Link
                                href={`/stock-transfer/sent/${transfer.id}`}
                                className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                              >
                                View / Invoice
                              </Link>
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                              <table className="data-table min-w-[720px]">
                                <thead>
                                  <tr>
                                    <th>Item Code</th>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Metal</th>
                                    <th>Price</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transfer.items.map((item) => (
                                    <tr key={item.id}>
                                      <td className="td-code">
                                        <ItemCodeLink
                                          itemCode={item.itemCode}
                                          className="text-xs"
                                        />
                                      </td>
                                      <td>{item.productName}</td>
                                      <td className="td-mono">{item.sku}</td>
                                      <td className="td-muted">
                                        {item.metal} {item.purity}
                                      </td>
                                      <td className="td-num">
                                        {formatCurrency(item.price)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
