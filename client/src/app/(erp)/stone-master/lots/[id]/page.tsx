"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteRawInventory } from "@/lib/auth/permissions";
import { adjustStoneLot, fetchStoneLotDetail } from "@/lib/api/stone-lots";
import type { StoneLotDetail } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function StoneLotDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const canManage = user ? canWriteRawInventory(user.role) : false;

  const [lot, setLot] = useState<StoneLotDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [qtyDelta, setQtyDelta] = useState("");
  const [reason, setReason] = useState("");
  const [adjustError, setAdjustError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      setLot(await fetchStoneLotDetail(id));
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load stone lot."));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage || !id) return;
    setAdjustError("");
    setSubmitting(true);
    try {
      const delta = parseInt(qtyDelta, 10);
      if (!Number.isFinite(delta) || delta === 0) {
        setAdjustError("Enter a non-zero quantity adjustment.");
        return;
      }
      if (!reason.trim()) {
        setAdjustError("Reason is required.");
        return;
      }
      const updated = await adjustStoneLot(id, { qtyDelta: delta, reason: reason.trim() });
      setLot(updated);
      setAdjustOpen(false);
      setQtyDelta("");
      setReason("");
    } catch (err) {
      setAdjustError(getApiErrorMessage(err, "Failed to adjust stock."));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <PageSkeleton />;
  if (error || !lot) {
    return (
      <div className="space-y-4">
        <p className="text-red-500">{error ?? "Stone lot not found."}</p>
        <Link
          href="/raw-inventory?tab=stones"
          className="text-amber-700 hover:underline text-sm"
        >
          ← Back to Stones
        </Link>
      </div>
    );
  }

  const sm = lot.stoneMaster;

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/raw-inventory?tab=stones"
          className="text-sm text-amber-700 hover:underline"
        >
          ← Stones
        </Link>
      </div>

      <PageHeader
        title={`${lot.lotNo} · ${sm?.stoneName ?? "Stone Lot"}`}
        subtitle={`${lot.vendorName} · Invoice ${lot.invoiceNo} · ${new Date(lot.invoiceDate).toLocaleDateString("en-IN")}${lot.location ? ` · ${lot.location}` : ""}`}
        action={
          canManage ? (
            <button
              type="button"
              onClick={() => setAdjustOpen(true)}
              className="btn-secondary px-4 py-2 text-sm"
            >
              Adjust Stock
            </button>
          ) : undefined
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MiniStat label="Purchased" value={`${lot.stats.purchasedQty} pcs`} sub={`${lot.stats.purchasedWeightCt.toFixed(2)} Ct`} />
        <MiniStat label="In Stock" value={`${lot.stats.inStockQty} pcs`} sub={`${lot.stats.inStockWeightCt.toFixed(2)} Ct`} />
        <MiniStat label="Issued (net)" value={`${lot.stats.issuedQty} pcs`} />
        <MiniStat label="Losses" value={`${lot.stats.lossQty} pcs`} sub={`₹${lot.stats.lossValue.toLocaleString("en-IN")}`} />
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 font-medium text-sm">
          Movement Ledger
        </div>
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-2">Date</th>
              <th className="text-left px-4 py-2">Type</th>
              <th className="text-left px-4 py-2">Reference</th>
              <th className="text-right px-4 py-2">Qty</th>
              <th className="text-right px-4 py-2">Balance</th>
            </tr>
          </thead>
          <tbody>
            {lot.movements.map((m) => {
              const isOut = ["Issue", "Breakage", "Loss"].includes(m.movementType);
              const signedQty = isOut ? -m.qty : m.qty;
              return (
                <tr key={m.id} className="border-t border-zinc-100">
                  <td className="px-4 py-2 text-zinc-600">
                    {new Date(m.createdAt).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2">
                    <span className={m.movementType === "Loss" ? "text-red-600" : ""}>
                      {m.movementType}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-zinc-600">
                    {m.notes ?? m.reason ?? m.karigarName ?? "—"}
                  </td>
                  <td className="px-4 py-2 text-right font-mono">
                    {signedQty > 0 ? "+" : ""}
                    {signedQty}
                  </td>
                  <td className="px-4 py-2 text-right">{m.balanceQtyAfter}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {adjustOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Adjust Stock</h2>
            <form onSubmit={handleAdjust} className="space-y-4">
              <div>
                <label className={labelClass}>Qty adjustment (+/- pcs)</label>
                <input
                  type="number"
                  className={fieldClass}
                  value={qtyDelta}
                  onChange={(e) => setQtyDelta(e.target.value)}
                  placeholder="e.g. -8 or +10"
                  required
                />
              </div>
              <div>
                <label className={labelClass}>Reason</label>
                <textarea
                  className={fieldClass}
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>
              {adjustError && <p className="text-xs text-red-500">{adjustError}</p>}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary px-4 py-2 text-sm"
                  onClick={() => setAdjustOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {submitting ? "Saving…" : "Save Adjustment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniStat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div className="card p-4 text-center">
      <p className="text-xs text-zinc-500 uppercase">{label}</p>
      <p className="text-xl font-semibold mt-1">{value}</p>
      {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
    </div>
  );
}
