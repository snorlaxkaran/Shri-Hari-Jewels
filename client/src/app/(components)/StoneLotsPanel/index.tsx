"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchStoneMasters } from "@/lib/api/stone-master";
import {
  fetchStoneLots,
  fetchStoneLotsSummary,
  receiveStoneLot,
} from "@/lib/api/stone-lots";
import { formatStoneMasterLabel } from "@/lib/stones/materials";
import type {
  NewStonePurchaseLotInput,
  StoneMaster,
  StonePurchaseLotSummaryCards,
  StonePurchaseLotWithMaster,
} from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type StoneLotsPanelProps = {
  canManage: boolean;
};

export default function StoneLotsPanel({ canManage }: StoneLotsPanelProps) {
  const router = useRouter();

  const [lots, setLots] = useState<StonePurchaseLotWithMaster[]>([]);
  const [summary, setSummary] = useState<StonePurchaseLotSummaryCards | null>(null);
  const [masters, setMasters] = useState<StoneMaster[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<Partial<NewStonePurchaseLotInput>>({
    invoiceDate: new Date().toISOString().slice(0, 10),
    gstPct: 0,
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lotRows, summaryRows, masterRows] = await Promise.all([
        fetchStoneLots({
          status: statusFilter || undefined,
          search: search.trim() || undefined,
        }),
        fetchStoneLotsSummary(),
        fetchStoneMasters({ activeOnly: true }),
      ]);
      setLots(lotRows);
      setSummary(summaryRows);
      setMasters(masterRows);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load stone lots."));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedMaster = useMemo(
    () => masters.find((m) => m.id === form.stoneMasterId),
    [form.stoneMasterId, masters],
  );

  const computedAmount = useMemo(() => {
    const qty = form.qtyPurchased ?? 0;
    const rate = form.purchaseRate ?? 0;
    return Math.round(qty * rate * 100) / 100;
  }, [form.qtyPurchased, form.purchaseRate]);

  const computedGst = useMemo(() => {
    const pct = form.gstPct ?? 0;
    return Math.round((computedAmount * pct) / 100 * 100) / 100;
  }, [computedAmount, form.gstPct]);

  const computedTotal = computedAmount + computedGst;

  const openReceive = () => {
    setForm({
      invoiceDate: new Date().toISOString().slice(0, 10),
      gstPct: 0,
      stoneMasterId: masters[0]?.id,
    });
    setFormError("");
    setModalOpen(true);
  };

  const handleReceive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setFormError("");
    setSubmitting(true);
    try {
      const lot = await receiveStoneLot(form as NewStonePurchaseLotInput);
      setLots((prev) => [lot, ...prev]);
      setModalOpen(false);
      void load();
      router.push(`/stone-master/lots/${lot.id}`);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to receive stone lot."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-500">
          Purchase receipts and live stock by lot, tied to Stone Master specs.
        </p>
        {canManage && (
          <button
            type="button"
            onClick={openReceive}
            className="btn-primary px-4 py-2 text-sm"
          >
            + Receive Stone Lot
          </button>
        )}
      </div>

      {summary && <SummaryCards summary={summary} />}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lot no, stone, vendor, invoice…"
          className="input-field px-3 py-2 text-sm min-w-[260px]"
        />
        {["", "Active", "Depleted", "Closed"].map((s) => (
          <button
            key={s || "all"}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs border ${
              statusFilter === s
                ? "bg-amber-100 border-amber-300 text-amber-900"
                : "bg-white border-zinc-200 text-zinc-600"
            }`}
          >
            {s || "All"}
          </button>
        ))}
        <Link href="/stone-master" className="text-sm text-amber-700 hover:underline ml-auto">
          Stone Master catalog →
        </Link>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Lot No</th>
              <th className="text-left px-4 py-3">Stone</th>
              <th className="text-left px-4 py-3">Vendor</th>
              <th className="text-right px-4 py-3">Purchased</th>
              <th className="text-right px-4 py-3">Balance</th>
              <th className="text-right px-4 py-3">Rate</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => {
              const lowStock =
                lot.reorderLevel != null && lot.currentQty <= lot.reorderLevel;
              return (
                <tr
                  key={lot.id}
                  className="border-t border-zinc-100 hover:bg-zinc-50/80 cursor-pointer"
                  onClick={() => router.push(`/stone-master/lots/${lot.id}`)}
                >
                  <td className="px-4 py-3 font-mono text-xs">
                    {lowStock && <span className="text-amber-600 mr-1">⚠</span>}
                    {lot.lotNo}
                  </td>
                  <td className="px-4 py-3">
                    {lot.stoneMaster
                      ? `${lot.stoneMaster.stoneName} ${lot.stoneMaster.sizeMm} ${lot.stoneMaster.shape}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3">{lot.vendorName}</td>
                  <td className="px-4 py-3 text-right">{lot.qtyPurchased} pcs</td>
                  <td className="px-4 py-3 text-right font-medium">
                    {lot.currentQty} pcs
                  </td>
                  <td className="px-4 py-3 text-right">₹{lot.purchaseRate}</td>
                  <td className="px-4 py-3">{lot.status}</td>
                </tr>
              );
            })}
            {lots.length === 0 && !loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-zinc-400">
                  No stone lots received yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
            <h2 className="text-lg font-semibold mb-4">Receive Stone Lot</h2>
            <form onSubmit={handleReceive} className="space-y-4">
              <div>
                <label className={labelClass}>Stone</label>
                <select
                  className={fieldClass}
                  value={form.stoneMasterId ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, stoneMasterId: e.target.value })
                  }
                  required
                >
                  <option value="">Select stone master entry…</option>
                  {masters.map((m) => (
                    <option key={m.id} value={m.id}>
                      {formatStoneMasterLabel(m)}
                    </option>
                  ))}
                </select>
                <Link
                  href="/stone-master"
                  className="text-xs text-amber-700 hover:underline mt-1 inline-block"
                >
                  + Create new stone master entry
                </Link>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Vendor Name</label>
                  <input
                    className={fieldClass}
                    value={form.vendorName ?? ""}
                    onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Invoice No.</label>
                  <input
                    className={fieldClass}
                    value={form.invoiceNo ?? ""}
                    onChange={(e) => setForm({ ...form, invoiceNo: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className={labelClass}>Invoice Date</label>
                  <input
                    type="date"
                    className={fieldClass}
                    value={form.invoiceDate?.slice(0, 10) ?? ""}
                    onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Vendor Stone Code</label>
                  <input
                    className={fieldClass}
                    value={form.vendorStoneCode ?? ""}
                    onChange={(e) =>
                      setForm({ ...form, vendorStoneCode: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label className={labelClass}>Packet No.</label>
                  <input
                    className={fieldClass}
                    value={form.packetNo ?? ""}
                    onChange={(e) => setForm({ ...form, packetNo: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Qty Purchased (Pcs)</label>
                  <input
                    type="number"
                    min={1}
                    className={fieldClass}
                    value={form.qtyPurchased ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        qtyPurchased: parseInt(e.target.value, 10) || undefined,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>Weight Purchased (Ct)</label>
                  <input
                    type="number"
                    step="0.0001"
                    min={0}
                    className={fieldClass}
                    value={form.weightPurchased ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        weightPurchased: parseFloat(e.target.value) || undefined,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>
                    Purchase Rate (per {selectedMaster?.uom ?? "Pcs"})
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min={0}
                    className={fieldClass}
                    value={form.purchaseRate ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        purchaseRate: parseFloat(e.target.value) || undefined,
                      })
                    }
                    required
                  />
                </div>
                <div>
                  <label className={labelClass}>GST %</label>
                  <input
                    type="number"
                    step="0.01"
                    min={0}
                    className={fieldClass}
                    value={form.gstPct ?? 0}
                    onChange={(e) =>
                      setForm({ ...form, gstPct: parseFloat(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="bg-zinc-50 rounded-lg p-3 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Amount</span>
                  <span>₹{computedAmount.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Amount</span>
                  <span>₹{computedGst.toLocaleString("en-IN")}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Total Amount</span>
                  <span>₹{computedTotal.toLocaleString("en-IN")}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Location</label>
                  <input
                    className={fieldClass}
                    value={form.location ?? ""}
                    onChange={(e) => setForm({ ...form, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelClass}>Reorder Level (Pcs)</label>
                  <input
                    type="number"
                    min={0}
                    className={fieldClass}
                    value={form.reorderLevel ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        reorderLevel: parseInt(e.target.value, 10) || undefined,
                      })
                    }
                  />
                </div>
              </div>

              {formError && <p className="text-xs text-red-500">{formError}</p>}

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="btn-secondary px-4 py-2 text-sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary px-4 py-2 text-sm"
                >
                  {submitting ? "Receiving…" : "Receive Lot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCards({ summary }: { summary: StonePurchaseLotSummaryCards }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard
        title="Total Lots"
        value={`${summary.totalLots} lots`}
        sub={`${summary.activeLots} active`}
      />
      <StatCard
        title="Total Stock"
        value={`${summary.totalQty.toLocaleString("en-IN")} pcs`}
        sub={`${summary.totalWeightCt.toFixed(1)} Ct`}
      />
      <StatCard
        title="Total Value"
        value={`₹${summary.totalValue.toLocaleString("en-IN")}`}
        sub="at cost"
      />
      <StatCard
        title="Losses MTD"
        value={`${summary.lossesMtdQty} pcs`}
        sub={`₹${summary.lossesMtdValue.toLocaleString("en-IN")} value`}
      />
    </div>
  );
}

function StatCard({
  title,
  value,
  sub,
}: {
  title: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="card p-4">
      <p className="text-xs text-zinc-500 uppercase tracking-wide">{title}</p>
      <p className="text-lg font-semibold mt-1">{value}</p>
      <p className="text-xs text-zinc-500 mt-1">{sub}</p>
    </div>
  );
}
