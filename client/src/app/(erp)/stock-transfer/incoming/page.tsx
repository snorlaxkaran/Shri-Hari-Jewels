"use client";

import { Fragment, useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronRight, Download, PackageOpen, Search } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";
import TransferTabs from "@/app/(components)/stock-transfer/TransferTabs";
import TransferStatusBadge from "@/app/(components)/stock-transfer/TransferStatusBadge";
import TransferItemsModal from "@/app/(components)/stock-transfer/TransferItemsModal";
import ReceiveTransferModal from "@/app/(components)/stock-transfer/ReceiveTransferModal";
import {
  fetchIncomingStockTransfers,
  rejectStockTransfer,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import {
  canReceiveStockTransfers,
  canViewStockTransfers,
} from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { useInventory } from "@/lib/inventory/inventory-context";
import {
  downloadTransferDetailCsv,
  downloadTransfersDetailCsv,
} from "@/lib/inventory/export-transfer";
import type { StockTransfer, StockTransferStatus } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

const FILTERS: Array<StockTransferStatus | "All"> = [
  "All",
  "Pending",
  "Accepted",
  "Rejected",
  "PartiallyAccepted",
];

export default function IncomingStockPage() {
  const { user } = useAuth();
  const { refresh } = useInventory();
  const canView = user ? canViewStockTransfers(user.role) : false;
  const canReceive = user ? canReceiveStockTransfers(user.role) : false;

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockTransferStatus | "All">(
    "Pending",
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(
    null,
  );
  const [receiveTransfer, setReceiveTransfer] = useState<StockTransfer | null>(
    null,
  );

  const loadTransfers = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchIncomingStockTransfers();
      setTransfers(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load incoming transfers."));
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    void loadTransfers();
  }, [loadTransfers]);

  const pendingCount = transfers.filter((t) => t.status === "Pending").length;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return transfers.filter((transfer) => {
      const matchesStatus =
        statusFilter === "All" || transfer.status === statusFilter;
      const matchesSearch =
        !q ||
        transfer.transferNo.toLowerCase().includes(q) ||
        transfer.fromBranchName.toLowerCase().includes(q) ||
        transfer.documentType.toLowerCase().includes(q) ||
        transfer.items.some(
          (item) =>
            item.itemCode.toLowerCase().includes(q) ||
            item.productName.toLowerCase().includes(q) ||
            item.sku.toLowerCase().includes(q),
        );
      return matchesStatus && matchesSearch;
    });
  }, [transfers, search, statusFilter]);

  const handleUpdated = async (updated: StockTransfer) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
    setSelectedTransfer(null);
    setReceiveTransfer(null);
    await refresh({ silent: true });
  };

  const handleQuickReject = async (transfer: StockTransfer) => {
    const reason = prompt(`Reason for rejecting ${transfer.transferNo}:`);
    if (!reason?.trim()) return;
    try {
      const updated = await rejectStockTransfer(transfer.id, reason.trim());
      await handleUpdated(updated);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reject transfer."));
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Incoming Stock"
        subtitle={`${pendingCount} pending proforma${pendingCount === 1 ? "" : "s"} awaiting receipt · scan items to accept into inventory`}
        action={
          <button
            type="button"
            onClick={() => downloadTransfersDetailCsv(filtered)}
            disabled={filtered.length === 0}
            className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Download size={16} />
            Download CSV
          </button>
        }
      />

      <TransferTabs pendingIncoming={pendingCount} />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transfer no., item code, SKU..."
            className="input-field w-full py-2 pl-9 pr-4 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((filter) => (
            <button
              key={filter}
              type="button"
              onClick={() => setStatusFilter(filter)}
              className={`tab-btn ${
                statusFilter === filter ? "tab-btn-active" : "tab-btn-inactive"
              }`}
            >
              {filter === "Pending" ? "Awaiting Receipt" : filter}
            </button>
          ))}
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[1100px]">
            <thead>
              <tr>
                <th className="w-10" />
                <th>Transfer No.</th>
                <th>Date</th>
                <th>From</th>
                <th>Document</th>
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
                  <td colSpan={10} className="text-center td-muted py-12">
                    <PackageOpen
                      size={28}
                      className="mx-auto mb-2 opacity-50"
                    />
                    No incoming transfers match your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((transfer) => {
                  const expanded = expandedId === transfer.id;
                  const receivedCount = transfer.items.filter(
                    (item) => item.accepted,
                  ).length;

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
                          {formatDate(transfer.createdAt)}
                        </td>
                        <td>{transfer.fromBranchName}</td>
                        <td className="td-muted">{transfer.documentType}</td>
                        <td className="td-num">
                          {transfer.status === "Pending" &&
                          receivedCount > 0 ? (
                            <span>
                              {receivedCount}/{transfer.itemCount}
                            </span>
                          ) : (
                            transfer.itemCount
                          )}
                        </td>
                        <td className="td-num">
                          {formatCurrency(transfer.totalValue)}
                        </td>
                        <td>
                          <TransferStatusBadge status={transfer.status} />
                        </td>
                        <td className="td-muted">{transfer.createdByName}</td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                downloadTransferDetailCsv(transfer)
                              }
                              className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                            >
                              <Download size={14} />
                              CSV
                            </button>
                            <button
                              type="button"
                              onClick={() => setSelectedTransfer(transfer)}
                              className="btn-secondary px-3 py-1.5 text-xs"
                            >
                              View Items
                            </button>
                            {canReceive && transfer.status === "Pending" && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => setReceiveTransfer(transfer)}
                                  className="btn-primary px-3 py-1.5 text-xs"
                                >
                                  Accept Items
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleQuickReject(transfer)}
                                  className="btn-secondary px-3 py-1.5 text-xs"
                                >
                                  Reject
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-zinc-50/80">
                          <td colSpan={10} className="py-4">
                            <div className="mb-3 grid gap-2 px-2 text-sm text-zinc-600 sm:grid-cols-2">
                              <p>
                                <span className="font-medium text-zinc-800">
                                  Sent:
                                </span>{" "}
                                {formatDateTime(transfer.createdAt)}
                              </p>
                              <p>
                                <span className="font-medium text-zinc-800">
                                  Transfer date:
                                </span>{" "}
                                {formatDate(transfer.transferDate)}
                              </p>
                              {transfer.notes && (
                                <p className="sm:col-span-2">
                                  <span className="font-medium text-zinc-800">
                                    Notes:
                                  </span>{" "}
                                  {transfer.notes}
                                </p>
                              )}
                              {transfer.acceptedAt && transfer.acceptedByName && (
                                <p>
                                  <span className="font-medium text-zinc-800">
                                    Received:
                                  </span>{" "}
                                  {formatDateTime(transfer.acceptedAt)} by{" "}
                                  {transfer.acceptedByName}
                                </p>
                              )}
                              {transfer.rejectionReason && (
                                <p className="text-red-600 sm:col-span-2">
                                  <span className="font-medium">Reason:</span>{" "}
                                  {transfer.rejectionReason}
                                </p>
                              )}
                            </div>
                            <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
                              <table className="data-table min-w-[820px]">
                                <thead>
                                  <tr>
                                    <th>Item Code</th>
                                    <th>Product</th>
                                    <th>SKU</th>
                                    <th>Metal</th>
                                    <th>Weight</th>
                                    <th>Price</th>
                                    <th>Received</th>
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
                                        {item.weightGrams ?? "—"}
                                      </td>
                                      <td className="td-num">
                                        {formatCurrency(item.price)}
                                      </td>
                                      <td>
                                        {item.accepted ? (
                                          <span className="text-emerald-700">
                                            ✓ Yes
                                          </span>
                                        ) : (
                                          <span className="text-amber-700">
                                            Pending
                                          </span>
                                        )}
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

      {selectedTransfer && (
        <TransferItemsModal
          transfer={selectedTransfer}
          open={Boolean(selectedTransfer)}
          onClose={() => setSelectedTransfer(null)}
          onUpdated={handleUpdated}
        />
      )}

      {receiveTransfer && (
        <ReceiveTransferModal
          transfer={receiveTransfer}
          open={Boolean(receiveTransfer)}
          onClose={() => setReceiveTransfer(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
