"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, Download, ScanLine } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";
import TransferStatusBadge from "@/app/(components)/stock-transfer/TransferStatusBadge";
import {
  acceptStockTransfer,
  fetchIncomingStockTransfer,
  scanReceiveStockTransfer,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { canReceiveStockTransfers } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import { useInventory } from "@/lib/inventory/inventory-context";
import { downloadTransferDetailCsv } from "@/lib/inventory/export-transfer";
import type { StockTransfer } from "@/lib/types";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/format";

export default function ReceiveIncomingTransferPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const transferId = params.id;
  const { user } = useAuth();
  const { refresh } = useInventory();
  const canReceive = user ? canReceiveStockTransfers(user.role) : false;

  const [transfer, setTransfer] = useState<StockTransfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [barcode, setBarcode] = useState("");
  const [scanning, setScanning] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const loadTransfer = useCallback(async () => {
    try {
      const data = await fetchIncomingStockTransfer(transferId);
      setTransfer(data);
      setError("");
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load transfer for verification."));
    } finally {
      setLoading(false);
    }
  }, [transferId]);

  useEffect(() => {
    void loadTransfer();
  }, [loadTransfer]);

  useEffect(() => {
    if (transfer && canReceive) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [transfer, canReceive]);

  const verifiedCount = useMemo(
    () => transfer?.items.filter((item) => item.accepted).length ?? 0,
    [transfer],
  );

  const allVerified =
    transfer != null && verifiedCount === transfer.items.length;

  const handleScan = async () => {
    if (!transfer || !canReceive) return;
    const code = barcode.trim();
    if (!code) return;

    setScanning(true);
    setError("");
    setInfo("");
    try {
      const result = await scanReceiveStockTransfer(transfer.id, code);
      setTransfer(result.transfer);
      setBarcode("");
      setInfo(`Verified ${code}.`);
      inputRef.current?.focus();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to verify item."));
    } finally {
      setScanning(false);
    }
  };

  const handleSave = () => {
    router.push("/stock-transfer/incoming");
  };

  const handleAccept = async () => {
    if (!transfer || !canReceive) return;
    if (!allVerified) {
      setError(
        `Verify all items before accepting (${transfer.items.length - verifiedCount} remaining).`,
      );
      return;
    }
    setAccepting(true);
    setError("");
    setInfo("");
    try {
      await acceptStockTransfer(transfer.id);
      await refresh({ silent: true });
      router.push("/stock-transfer/incoming");
      router.refresh();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to accept transfer into inventory."));
    } finally {
      setAccepting(false);
    }
  };

  if (loading) return <PageSkeleton />;

  if (!transfer) {
    return (
      <div className="page-content">
        <PageHeader title="Receive Transfer" subtitle="Transfer not found" />
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error || "This transfer is not available for your branch."}
        </div>
        <Link
          href="/stock-transfer/incoming"
          className="btn-secondary mt-4 inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <ArrowLeft size={16} />
          Back to Incoming Stock
        </Link>
      </div>
    );
  }

  return (
    <div className="page-content pb-28">
      <PageHeader
        title={`Verify Transfer — ${transfer.transferNo}`}
        subtitle={`${transfer.fromBranchName} → ${transfer.toBranchName} · scan every item, then Accept to add stock to branch inventory`}
        action={
          <button
            type="button"
            onClick={() => downloadTransferDetailCsv(transfer)}
            className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Download size={16} />
            Download CSV
          </button>
        }
      />

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {info && (
        <div className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {info}
        </div>
      )}

      <div className="mb-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="surface-card p-5 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <TransferStatusBadge status={transfer.status} />
            <span className="text-sm text-zinc-500">
              {transfer.documentType} · {formatDate(transfer.transferDate)}
            </span>
          </div>

          <div className="grid gap-2 text-sm text-zinc-600 sm:grid-cols-2">
            <p>
              <span className="font-medium text-zinc-800">Sent:</span>{" "}
              {formatDateTime(transfer.createdAt)}
            </p>
            <p>
              <span className="font-medium text-zinc-800">Sent by:</span>{" "}
              {transfer.createdByName}
            </p>
            <p>
              <span className="font-medium text-zinc-800">Items:</span>{" "}
              {transfer.itemCount}
            </p>
            <p>
              <span className="font-medium text-zinc-800">Total value:</span>{" "}
              {formatCurrency(transfer.totalValue)}
            </p>
            {transfer.notes && (
              <p className="sm:col-span-2">
                <span className="font-medium text-zinc-800">Notes:</span>{" "}
                {transfer.notes}
              </p>
            )}
          </div>

          {canReceive && (
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-500">
                Scan barcode to verify item
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <ScanLine
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    ref={inputRef}
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        void handleScan();
                      }
                    }}
                    placeholder="Scan item code"
                    className="input-field w-full py-2 pl-9 pr-4 text-sm"
                    disabled={scanning || accepting || allVerified}
                    autoFocus
                  />
                </div>
                <button
                  type="button"
                  onClick={() => void handleScan()}
                  disabled={scanning || accepting || !barcode.trim() || allVerified}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {scanning ? "Scanning..." : "Verify"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="surface-card p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
            Verification progress
          </p>
          <p className="mt-2 text-3xl font-semibold text-zinc-900">
            {verifiedCount}
            <span className="text-lg font-normal text-zinc-400">
              {" "}
              / {transfer.items.length}
            </span>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {allVerified
              ? "All items verified — ready to accept into inventory."
              : "Scan each physical item against this list."}
          </p>
        </div>
      </div>

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="data-table min-w-[900px]">
            <thead>
              <tr>
                <th className="w-10" />
                <th>Item Code</th>
                <th>Product</th>
                <th>SKU</th>
                <th>Metal</th>
                <th>Weight</th>
                <th>Price</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items.map((item) => (
                <tr
                  key={item.id}
                  className={item.accepted ? "bg-emerald-50/60" : undefined}
                >
                  <td>
                    {item.accepted ? (
                      <Check size={16} className="text-emerald-600" />
                    ) : (
                      <span className="inline-block h-4 w-4 rounded border border-zinc-300" />
                    )}
                  </td>
                  <td className="td-code">
                    <ItemCodeLink itemCode={item.itemCode} className="text-xs" />
                  </td>
                  <td>{item.productName}</td>
                  <td className="td-mono">{item.sku}</td>
                  <td className="td-muted">
                    {item.metal} {item.purity}
                  </td>
                  <td className="td-num">{item.weightGrams ?? "—"}</td>
                  <td className="td-num">{formatCurrency(item.price)}</td>
                  <td>
                    {item.accepted ? (
                      <span className="text-emerald-700">Verified</span>
                    ) : (
                      <span className="text-amber-700">Awaiting scan</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-200 bg-white/95 backdrop-blur md:left-[220px]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-4">
          <Link
            href="/stock-transfer/incoming"
            className="btn-secondary px-4 py-2 text-sm"
          >
            Cancel
          </Link>
          <div className="flex flex-wrap gap-2">
            {canReceive && (
              <>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={accepting}
                  className="btn-secondary px-4 py-2 text-sm"
                  title={
                    allVerified
                      ? "Return to incoming stock — use Accept to finish"
                      : "Save progress and return to incoming stock"
                  }
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => void handleAccept()}
                  disabled={accepting || !allVerified}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                  title={
                    allVerified
                      ? "Accept verified stock into branch inventory"
                      : "Verify every item before accepting"
                  }
                >
                  {accepting ? "Accepting..." : "Accept"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
