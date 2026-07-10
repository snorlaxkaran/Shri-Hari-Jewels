"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ScanLine, X } from "lucide-react";
import {
  partialAcceptStockTransfer,
  scanReceiveStockTransfer,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import type { StockTransfer } from "@/lib/types";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";

type Props = {
  transfer: StockTransfer;
  open: boolean;
  onClose: () => void;
  onUpdated: (transfer: StockTransfer) => void;
};

export default function ReceiveTransferModal({
  transfer,
  open,
  onClose,
  onUpdated,
}: Props) {
  const [currentTransfer, setCurrentTransfer] = useState(transfer);
  const [barcode, setBarcode] = useState("");
  const [scanError, setScanError] = useState("");
  const [loading, setLoading] = useState(false);
  const [partialMode, setPartialMode] = useState(false);
  const [partialReason, setPartialReason] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentTransfer(transfer);
  }, [transfer]);

  useEffect(() => {
    if (open) {
      setBarcode("");
      setScanError("");
      setPartialMode(false);
      setPartialReason("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open, transfer.id]);

  const receivedCount = useMemo(
    () => currentTransfer.items.filter((item) => item.accepted).length,
    [currentTransfer.items],
  );

  const allAccepted = receivedCount === currentTransfer.items.length;
  const pendingItems = currentTransfer.items.filter((item) => !item.accepted);

  if (!open) return null;

  const handleScan = async () => {
    const code = barcode.trim();
    if (!code) return;

    setScanError("");
    setLoading(true);
    try {
      const result = await scanReceiveStockTransfer(currentTransfer.id, code);
      setCurrentTransfer(result.transfer);
      setBarcode("");
      if (result.allAccepted) {
        onUpdated(result.transfer);
        onClose();
        return;
      }
      inputRef.current?.focus();
    } catch (err) {
      setScanError(getApiErrorMessage(err, "Failed to scan item."));
    } finally {
      setLoading(false);
    }
  };

  const handlePartialAccept = async () => {
    const accepted = currentTransfer.items
      .filter((item) => item.accepted)
      .map((item) => item.itemCode);
    const rejected = currentTransfer.items
      .filter((item) => !item.accepted)
      .map((item) => item.itemCode);

    if (accepted.length === 0) {
      setScanError("Scan at least one item before accepting partially.");
      return;
    }
    if (rejected.length > 0 && !partialReason.trim()) {
      setScanError("Provide a reason for missing items.");
      return;
    }

    setLoading(true);
    setScanError("");
    try {
      const updated = await partialAcceptStockTransfer(currentTransfer.id, {
        accepted,
        rejected,
        reason: partialReason.trim() || undefined,
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setScanError(getApiErrorMessage(err, "Failed to accept transfer."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="surface-card flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Receive Transfer — {currentTransfer.transferNo}
            </h2>
            <p className="text-xs text-zinc-500">
              {currentTransfer.fromBranchName} → {currentTransfer.toBranchName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Scan barcode to receive
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
                  onChange={(e) => {
                    setBarcode(e.target.value);
                    setScanError("");
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      void handleScan();
                    }
                  }}
                  placeholder="Scan item code"
                  className="input-field w-full py-2 pl-9 pr-4 text-sm"
                  disabled={loading || allAccepted}
                  autoFocus
                />
              </div>
              <button
                type="button"
                onClick={() => void handleScan()}
                disabled={loading || !barcode.trim() || allAccepted}
                className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
              >
                {loading ? "Scanning..." : "Scan"}
              </button>
            </div>
            {scanError && (
              <p className="mt-2 text-sm text-red-600">{scanError}</p>
            )}
          </div>

          <p className="text-sm text-zinc-600">
            <span className="font-medium text-zinc-900">
              {receivedCount} of {currentTransfer.items.length}
            </span>{" "}
            items received
          </p>

          <div className="max-h-[40vh] overflow-auto rounded-lg border border-zinc-200">
            <table className="w-full min-w-[560px] text-sm">
              <thead>
                <tr className="bg-zinc-50 text-zinc-500">
                  <th className="w-10 px-3 py-2 text-left font-medium" />
                  <th className="px-3 py-2 text-left font-medium">Item Code</th>
                  <th className="px-3 py-2 text-left font-medium">Product</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {currentTransfer.items.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-t border-zinc-100 ${
                      item.accepted ? "bg-emerald-50/60" : ""
                    }`}
                  >
                    <td className="px-3 py-2">
                      {item.accepted ? (
                        <Check size={16} className="text-emerald-600" />
                      ) : (
                        <span className="inline-block h-4 w-4 rounded border border-zinc-300" />
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">
                      <ItemCodeLink itemCode={item.itemCode} className="text-xs" />
                    </td>
                    <td className="px-3 py-2">{item.productName}</td>
                    <td className="px-3 py-2">
                      {item.accepted ? (
                        <span className="text-emerald-700">✓ Received</span>
                      ) : (
                        <span className="text-amber-700">Pending</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {partialMode && pendingItems.length > 0 && (
            <div>
              <label className="mb-1 block text-xs text-zinc-500">
                Reason for missing items ({pendingItems.length} not scanned)
              </label>
              <textarea
                value={partialReason}
                onChange={(e) => setPartialReason(e.target.value)}
                rows={2}
                className="input-field w-full px-3 py-2 text-sm"
                placeholder="Items missing from shipment..."
              />
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 px-5 py-4">
          {allAccepted ? (
            <button
              type="button"
              onClick={() => {
                onUpdated(currentTransfer);
                onClose();
              }}
              className="btn-primary px-4 py-2 text-sm"
            >
              Complete Transfer
            </button>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={loading}
                className="btn-secondary px-4 py-2 text-sm"
              >
                Close
              </button>
              {receivedCount > 0 && pendingItems.length > 0 && (
                <>
                  {!partialMode ? (
                    <button
                      type="button"
                      onClick={() => setPartialMode(true)}
                      disabled={loading}
                      className="btn-secondary px-4 py-2 text-sm"
                    >
                      Accept Partial
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => void handlePartialAccept()}
                      disabled={loading}
                      className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                    >
                      {loading ? "Submitting..." : "Confirm Partial Accept"}
                    </button>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
