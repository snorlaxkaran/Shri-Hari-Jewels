"use client";

import { useState } from "react";
import { X } from "lucide-react";
import {
  acceptStockTransfer,
  partialAcceptStockTransfer,
  rejectStockTransfer,
} from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import { canManageStockTransfers } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import type { StockTransfer } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

type Props = {
  transfer: StockTransfer;
  open: boolean;
  onClose: () => void;
  onUpdated: (transfer: StockTransfer) => void;
};

export default function TransferItemsModal({
  transfer,
  open,
  onClose,
  onUpdated,
}: Props) {
  const { user } = useAuth();
  const canAct = user ? canManageStockTransfers(user.role) : false;
  const isPending = transfer.status === "Pending";

  const [mode, setMode] = useState<"view" | "partial">("view");
  const [checked, setChecked] = useState<Set<string>>(
    () => new Set(transfer.items.map((item) => item.itemCode)),
  );
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const resetPartial = () => {
    setMode("view");
    setChecked(new Set(transfer.items.map((item) => item.itemCode)));
    setReason("");
    setError("");
  };

  const handleAcceptAll = async () => {
    setLoading(true);
    setError("");
    try {
      const updated = await acceptStockTransfer(transfer.id);
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to accept transfer."));
    } finally {
      setLoading(false);
    }
  };

  const handleRejectAll = async () => {
    const rejectReason = prompt("Reason for rejecting this transfer:");
    if (!rejectReason?.trim()) return;
    setLoading(true);
    setError("");
    try {
      const updated = await rejectStockTransfer(transfer.id, rejectReason.trim());
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to reject transfer."));
    } finally {
      setLoading(false);
    }
  };

  const handlePartialSubmit = async () => {
    const accepted = transfer.items
      .filter((item) => checked.has(item.itemCode))
      .map((item) => item.itemCode);
    const rejected = transfer.items
      .filter((item) => !checked.has(item.itemCode))
      .map((item) => item.itemCode);

    if (accepted.length === 0) {
      setError("Select at least one item to accept.");
      return;
    }
    if (rejected.length > 0 && !reason.trim()) {
      setError("Provide a reason for rejected items.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const updated = await partialAcceptStockTransfer(transfer.id, {
        accepted,
        rejected,
        reason: reason.trim() || undefined,
      });
      onUpdated(updated);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to submit partial accept."));
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
              {transfer.transferNo} — {transfer.itemCount} Items
            </h2>
            <p className="text-xs text-zinc-500">
              {transfer.fromBranchName} → {transfer.toBranchName}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              resetPartial();
              onClose();
            }}
            className="text-zinc-400 hover:text-zinc-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-auto px-5 py-4">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="text-zinc-500">
                {mode === "partial" && isPending && (
                  <th className="w-10 px-2 py-2 text-left font-medium">OK</th>
                )}
                <th className="px-2 py-2 text-left font-medium">Item Code</th>
                <th className="px-2 py-2 text-left font-medium">Product</th>
                <th className="px-2 py-2 text-left font-medium">SKU</th>
                <th className="px-2 py-2 text-left font-medium">Price</th>
              </tr>
            </thead>
            <tbody>
              {transfer.items.map((item) => (
                <tr key={item.id} className="border-t border-zinc-100">
                  {mode === "partial" && isPending && (
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={checked.has(item.itemCode)}
                        onChange={(e) => {
                          setChecked((prev) => {
                            const next = new Set(prev);
                            if (e.target.checked) next.add(item.itemCode);
                            else next.delete(item.itemCode);
                            return next;
                          });
                        }}
                      />
                    </td>
                  )}
                  <td className="px-2 py-2 font-mono text-xs">{item.itemCode}</td>
                  <td className="px-2 py-2">{item.productName}</td>
                  <td className="px-2 py-2 font-mono text-xs">{item.sku}</td>
                  <td className="px-2 py-2">{formatCurrency(item.price)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {mode === "partial" && isPending && (
            <div className="mt-4">
              <label className="text-xs mb-1 block text-zinc-500">
                Reason for rejected items
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="input-field w-full px-3 py-2 text-sm"
                placeholder="Damaged, missing from box, wrong item..."
              />
            </div>
          )}
        </div>

        {canAct && isPending && (
          <div className="flex flex-wrap justify-end gap-2 border-t border-zinc-200 px-5 py-4">
            {mode === "view" ? (
              <>
                <button
                  type="button"
                  onClick={handleRejectAll}
                  disabled={loading}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                >
                  Reject All
                </button>
                <button
                  type="button"
                  onClick={() => setMode("partial")}
                  disabled={loading}
                  className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
                >
                  Partial Accept
                </button>
                <button
                  type="button"
                  onClick={handleAcceptAll}
                  disabled={loading}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {loading ? "Processing..." : "Accept All"}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={resetPartial}
                  disabled={loading}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handlePartialSubmit}
                  disabled={loading}
                  className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
                >
                  {loading ? "Submitting..." : "Submit Partial Accept"}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
