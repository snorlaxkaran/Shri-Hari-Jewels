"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, PackageOpen } from "lucide-react";
import TransferStatusBadge from "@/app/(components)/stock-transfer/TransferStatusBadge";
import { fetchIncomingStockTransfers } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { canReceiveStockTransfers, canViewStockTransfers } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { downloadTransferDetailCsv } from "@/lib/inventory/export-transfer";
import type { StockTransfer } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";

export default function IncomingTransfersPanel() {
  const { user } = useAuth();
  const canView = user ? canViewStockTransfers(user.role) : false;
  const canReceive = user ? canReceiveStockTransfers(user.role) : false;

  const [transfers, setTransfers] = useState<StockTransfer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadTransfers = useCallback(async () => {
    if (!canView) {
      setLoading(false);
      return;
    }
    try {
      const data = await fetchIncomingStockTransfers("Pending");
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

  if (!canView || loading || transfers.length === 0) {
    return null;
  }

  return (
    <>
      <div className="mb-5 surface-card overflow-hidden border-amber-200">
        <div className="flex flex-col gap-3 border-b border-zinc-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-amber-50 p-2 text-amber-700">
              <PackageOpen size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-zinc-900">
                Incoming Stock — {transfers.length} proforma
                {transfers.length === 1 ? "" : "s"} awaiting receipt
              </h2>
              <p className="text-xs text-zinc-500">
                Review the transfer details, download CSV, then scan each item to
                accept into branch inventory.
              </p>
            </div>
          </div>
          <Link
            href="/stock-transfer/incoming"
            className="btn-secondary px-3 py-1.5 text-xs"
          >
            View all incoming
          </Link>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th>Transfer No.</th>
                <th>Date</th>
                <th>From</th>
                <th>Document</th>
                <th>Items</th>
                <th>Value</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {transfers.map((transfer) => (
                <tr key={transfer.id}>
                  <td className="td-code">{transfer.transferNo}</td>
                  <td className="td-muted">{formatDate(transfer.createdAt)}</td>
                  <td>{transfer.fromBranchName}</td>
                  <td className="td-muted">{transfer.documentType}</td>
                  <td className="td-num">{transfer.itemCount}</td>
                  <td className="td-num">
                    {formatCurrency(transfer.totalValue)}
                  </td>
                  <td>
                    <TransferStatusBadge status={transfer.status} />
                  </td>
                  <td>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => downloadTransferDetailCsv(transfer)}
                        className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
                      >
                        <Download size={14} />
                        CSV
                      </button>
                      {canReceive && (
                        <Link
                          href={`/stock-transfer/incoming/${transfer.id}/receive`}
                          className="btn-primary px-3 py-1.5 text-xs"
                        >
                          Verify & Accept
                        </Link>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
