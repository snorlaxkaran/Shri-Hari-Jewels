"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PackageOpen, Search } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import TransferTabs from "@/app/(components)/stock-transfer/TransferTabs";
import TransferStatusBadge from "@/app/(components)/stock-transfer/TransferStatusBadge";
import TransferItemsModal from "@/app/(components)/stock-transfer/TransferItemsModal";
import {
  fetchIncomingStockTransfers,
  rejectStockTransfer,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { canManageStockTransfers } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { useInventory } from "@/lib/inventory/inventory-context";
import type { StockTransfer, StockTransferStatus } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/format";

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
  const canAct = user ? canManageStockTransfers(user.role) : false;

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StockTransferStatus | "All">(
    "All",
  );
  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(
    null,
  );

  const loadTransfers = useCallback(async () => {
    try {
      const data = await fetchIncomingStockTransfers();
      setTransfers(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load incoming transfers."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTransfers();
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
        transfer.items.some(
          (item) =>
            item.itemCode.toLowerCase().includes(q) ||
            item.productName.toLowerCase().includes(q),
        );
      return matchesStatus && matchesSearch;
    });
  }, [transfers, search, statusFilter]);

  const handleUpdated = async (updated: StockTransfer) => {
    setTransfers((prev) =>
      prev.map((t) => (t.id === updated.id ? updated : t)),
    );
    setSelectedTransfer(null);
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
        subtitle={`${pendingCount} pending transfer${pendingCount === 1 ? "" : "s"} awaiting acceptance`}
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
            placeholder="Search transfer no., item code..."
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
              {filter}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <div className="surface-card px-5 py-12 text-center text-sm text-zinc-400">
            <PackageOpen size={28} className="mx-auto mb-2 opacity-50" />
            No incoming transfers match your filters.
          </div>
        ) : (
          filtered.map((transfer) => (
            <div key={transfer.id} className="surface-card p-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <TransferStatusBadge status={transfer.status} />
                    <span className="font-mono text-sm text-zinc-900">
                      {transfer.transferNo}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-700">
                    From: {transfer.fromBranchName} → To:{" "}
                    {transfer.customerBranchName ?? transfer.toBranchName}
                    {transfer.customerName && (
                      <span className="text-zinc-400">
                        {" "}
                        ({transfer.customerName})
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Sent: {formatDateTime(transfer.createdAt)} · {transfer.itemCount}{" "}
                    items · {formatCurrency(transfer.totalValue)}
                  </p>
                  <p className="text-sm text-zinc-500">
                    Document: {transfer.documentType}
                    {transfer.notes ? ` · Notes: "${transfer.notes}"` : ""}
                  </p>
                  {transfer.acceptedAt && transfer.acceptedByName && (
                    <p className="text-sm text-zinc-500">
                      {transfer.status === "Accepted" ||
                      transfer.status === "PartiallyAccepted"
                        ? "Accepted"
                        : "Resolved"}
                      : {formatDateTime(transfer.acceptedAt)} by{" "}
                      {transfer.acceptedByName}
                    </p>
                  )}
                  {transfer.rejectionReason && (
                    <p className="text-sm text-red-600">
                      Reason: {transfer.rejectionReason}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTransfer(transfer)}
                    className="btn-secondary px-4 py-2 text-sm"
                  >
                    View Items
                  </button>
                  {canAct && transfer.status === "Pending" && (
                    <>
                      <button
                        type="button"
                        onClick={() => setSelectedTransfer(transfer)}
                        className="btn-primary px-4 py-2 text-sm"
                      >
                        Accept
                      </button>
                      <button
                        type="button"
                        onClick={() => handleQuickReject(transfer)}
                        className="btn-secondary px-4 py-2 text-sm"
                      >
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {selectedTransfer && (
        <TransferItemsModal
          transfer={selectedTransfer}
          open={Boolean(selectedTransfer)}
          onClose={() => setSelectedTransfer(null)}
          onUpdated={handleUpdated}
        />
      )}
    </div>
  );
}
