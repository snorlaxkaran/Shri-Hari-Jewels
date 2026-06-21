"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, Search } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import TransferTabs from "@/app/(components)/stock-transfer/TransferTabs";
import { fetchSentStockTransfers, cancelStockTransfer } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { canManageStockTransfers } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import TransferStatusBadge from "@/app/(components)/stock-transfer/TransferStatusBadge";
import {
  downloadTransferCsv,
  downloadTransfersCsv,
} from "@/lib/inventory/export-transfer";
import type { StockTransfer } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export default function SentStockPage() {
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
    const names = [...new Set(transfers.map((t) => t.toBranchName))].sort();
    return ["All", ...names];
  }, [transfers]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const matchesStore =
        storeFilter === "All" || transfer.toBranchName === storeFilter;
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
    <div>
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

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer no., store, item code, SKU..."
            className="input-field w-full pl-9 pr-4 py-2 text-sm"
          />
        </div>
        <select
          value={storeFilter}
          onChange={(e) => setStoreFilter(e.target.value)}
          className="input-field px-3 py-2 text-sm"
        >
          {stores.map((store) => (
            <option key={store} value={store}>
              {store === "All" ? "All Stores" : store}
            </option>
          ))}
        </select>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="bg-zinc-50 text-zinc-500">
                <th className="w-10 px-3 py-3" />
                <th className="text-left px-5 py-3 font-medium">Transfer No.</th>
                <th className="text-left px-5 py-3 font-medium">Date</th>
                <th className="text-left px-5 py-3 font-medium">Store</th>
                <th className="text-left px-5 py-3 font-medium">Document</th>
                <th className="text-left px-5 py-3 font-medium">Items</th>
                <th className="text-left px-5 py-3 font-medium">Value</th>
                <th className="text-left px-5 py-3 font-medium">Status</th>
                <th className="text-left px-5 py-3 font-medium">Sent By</th>
                <th className="text-left px-5 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-5 py-10 text-center text-sm text-zinc-400"
                  >
                    No transfers sent yet. Use Scan &amp; Send to transfer stock.
                  </td>
                </tr>
              ) : (
                filtered.map((transfer) => {
                  const expanded = expandedId === transfer.id;
                  return (
                    <Fragment key={transfer.id}>
                      <tr className="border-t border-zinc-100 text-zinc-900">
                        <td className="px-3 py-3">
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
                        <td className="px-5 py-3 font-mono text-xs">
                          {transfer.transferNo}
                        </td>
                        <td className="px-5 py-3">
                          {formatDate(transfer.transferDate)}
                        </td>
                        <td className="px-5 py-3">{transfer.toBranchName}</td>
                        <td className="px-5 py-3">{transfer.documentType}</td>
                        <td className="px-5 py-3">{transfer.itemCount}</td>
                        <td className="px-5 py-3">
                          {formatCurrency(transfer.totalValue)}
                        </td>
                        <td className="px-5 py-3">
                          <TransferStatusBadge status={transfer.status} />
                        </td>
                        <td className="px-5 py-3">{transfer.createdByName}</td>
                        <td className="px-5 py-3">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => downloadTransferCsv(transfer)}
                              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                            >
                              <Download size={14} />
                              CSV
                            </button>
                            {canAct && transfer.status === "Pending" && (
                              <button
                                type="button"
                                onClick={() => handleCancel(transfer)}
                                className="btn-secondary px-3 py-1.5 text-xs text-red-700"
                              >
                                Cancel
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-zinc-50/80">
                          <td colSpan={10} className="px-5 py-4">
                            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                              <table className="w-full min-w-[720px] text-sm">
                                <thead>
                                  <tr className="text-zinc-500">
                                    <th className="text-left px-4 py-2 font-medium">
                                      Item Code
                                    </th>
                                    <th className="text-left px-4 py-2 font-medium">
                                      Product
                                    </th>
                                    <th className="text-left px-4 py-2 font-medium">
                                      SKU
                                    </th>
                                    <th className="text-left px-4 py-2 font-medium">
                                      Metal
                                    </th>
                                    <th className="text-left px-4 py-2 font-medium">
                                      Price
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {transfer.items.map((item) => (
                                    <tr
                                      key={item.id}
                                      className="border-t border-zinc-100"
                                    >
                                      <td className="px-4 py-2 font-mono text-xs">
                                        {item.itemCode}
                                      </td>
                                      <td className="px-4 py-2">
                                        {item.productName}
                                      </td>
                                      <td className="px-4 py-2 font-mono text-xs">
                                        {item.sku}
                                      </td>
                                      <td className="px-4 py-2">
                                        {item.metal} {item.purity}
                                      </td>
                                      <td className="px-4 py-2">
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
