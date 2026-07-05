"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createStoneType, fetchStoneTypes } from "@/lib/api/stone-types";
import {
  fetchStoneLots,
  fetchStoneLotsSummary,
  quickAddStoneLot,
} from "@/lib/api/stone-lots";
import { previewNextLotNo } from "@/lib/stones/lot-number";
import type {
  SimplifiedStoneEntryInput,
  StonePurchaseLotSummaryCards,
  StonePurchaseLotWithMaster,
  StoneType,
} from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type StoneLotsPanelProps = {
  canManage: boolean;
};

type EntryFormState = {
  stoneTypeId: string;
  newStoneTypeName: string;
  qtyPurchased: string;
  weightPurchased: string;
  purchaseRate: string;
  vendorName: string;
  invoiceDate: string;
  lotNo: string;
};

const emptyForm = (): EntryFormState => ({
  stoneTypeId: "",
  newStoneTypeName: "",
  qtyPurchased: "",
  weightPurchased: "",
  purchaseRate: "",
  vendorName: "",
  invoiceDate: new Date().toISOString().slice(0, 10),
  lotNo: "",
});

export default function StoneLotsPanel({ canManage }: StoneLotsPanelProps) {
  const router = useRouter();

  const [lots, setLots] = useState<StonePurchaseLotWithMaster[]>([]);
  const [summary, setSummary] = useState<StonePurchaseLotSummaryCards | null>(null);
  const [stoneTypes, setStoneTypes] = useState<StoneType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");

  const [form, setForm] = useState<EntryFormState>(emptyForm);
  const [addingNewType, setAddingNewType] = useState(false);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [lotRows, summaryRows, typeRows] = await Promise.all([
        fetchStoneLots({
          status: statusFilter || undefined,
          search: search.trim() || undefined,
        }),
        fetchStoneLotsSummary(),
        fetchStoneTypes(),
      ]);
      setLots(lotRows);
      setSummary(summaryRows);
      setStoneTypes(typeRows);
    } catch (err) {
      setError(getApiErrorMessage(err, "Could not load stone stock."));
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const existingLotNos = useMemo(() => lots.map((l) => l.lotNo), [lots]);
  const previewLotNo = useMemo(
    () => previewNextLotNo(existingLotNos),
    [existingLotNos],
  );
  const displayedLotNo = form.lotNo.trim() || previewLotNo;

  const hasPieces = form.qtyPurchased.trim() !== "" && Number(form.qtyPurchased) > 0;
  const hasWeight =
    form.weightPurchased.trim() !== "" && Number(form.weightPurchased) > 0;
  const rateUnit = hasPieces ? "piece" : hasWeight ? "carat" : "unit";

  const entryValuePreview = useMemo(() => {
    const rate = parseFloat(form.purchaseRate) || 0;
    if (hasPieces) return Math.round(Number(form.qtyPurchased) * rate * 100) / 100;
    if (hasWeight) return Math.round(Number(form.weightPurchased) * rate * 100) / 100;
    return 0;
  }, [form.purchaseRate, form.qtyPurchased, form.weightPurchased, hasPieces, hasWeight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setFormError("");

    if (!hasPieces && !hasWeight) {
      setFormError("Enter pieces or weight — at least one is required.");
      return;
    }
    if (!form.vendorName.trim()) {
      setFormError("Supplier name is required.");
      return;
    }
    const rate = parseFloat(form.purchaseRate);
    if (Number.isNaN(rate) || rate < 0) {
      setFormError("Rate is required.");
      return;
    }

    setSubmitting(true);
    try {
      let stoneTypeId = form.stoneTypeId || undefined;
      let stoneName: string | undefined;

      if (addingNewType) {
        const name = form.newStoneTypeName.trim();
        if (!name) {
          setFormError("Enter a name for the new stone type.");
          setSubmitting(false);
          return;
        }
        const created = await createStoneType({ name });
        setStoneTypes((prev) =>
          [...prev, created].sort((a, b) => a.name.localeCompare(b.name)),
        );
        stoneTypeId = created.id;
        setAddingNewType(false);
      } else if (!stoneTypeId) {
        setFormError("Select a stone type.");
        setSubmitting(false);
        return;
      }

      const payload: SimplifiedStoneEntryInput = {
        stoneTypeId,
        stoneName,
        lotNo: form.lotNo.trim() || undefined,
        qtyPurchased: hasPieces ? parseInt(form.qtyPurchased, 10) : undefined,
        weightPurchased: hasWeight
          ? parseFloat(form.weightPurchased)
          : undefined,
        purchaseRate: rate,
        vendorName: form.vendorName.trim(),
        invoiceDate: form.invoiceDate || undefined,
      };

      const lot = await quickAddStoneLot(payload);
      setLots((prev) => [lot, ...prev]);
      setForm(emptyForm());
      void load();
      router.push(`/stone-master/lots/${lot.id}`);
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to log stone stock."));
    } finally {
      setSubmitting(false);
    }
  };

  const formatBalance = (lot: StonePurchaseLotWithMaster) => {
    const uom = lot.stoneMaster?.uom ?? "Pcs";
    if (uom === "Carat" && lot.currentWeightCt > 0) {
      return `${lot.currentWeightCt.toFixed(2)} ct`;
    }
    if (lot.currentQty > 0) {
      return `${lot.currentQty} pcs`;
    }
    if (lot.currentWeightCt > 0) {
      return `${lot.currentWeightCt.toFixed(2)} ct`;
    }
    return "—";
  };

  const formatPurchased = (lot: StonePurchaseLotWithMaster) => {
    const parts: string[] = [];
    if (lot.qtyPurchased > 0) parts.push(`${lot.qtyPurchased} pcs`);
    if (lot.weightPurchased > 0) parts.push(`${lot.weightPurchased.toFixed(2)} ct`);
    return parts.length ? parts.join(" · ") : "—";
  };

  const formatRate = (lot: StonePurchaseLotWithMaster) => {
    const uom = lot.stoneMaster?.uom ?? "Pcs";
    const unit = uom === "Carat" ? "ct" : "pc";
    return `₹${lot.purchaseRate}/${unit}`;
  };

  return (
    <div className="space-y-6">
      {summary && (
        <div className="card p-6 bg-gradient-to-br from-amber-50 to-white border-amber-200">
          <p className="text-xs uppercase tracking-wide text-amber-800/70 font-medium">
            Total Stone Value in Stock
          </p>
          <p className="text-3xl font-semibold text-amber-950 mt-1">
            ₹{summary.totalValue.toLocaleString("en-IN")}
          </p>
          <p className="text-sm text-amber-900/60 mt-1">
            {summary.activeLots} active entries · {summary.totalLots} total
          </p>
        </div>
      )}

      {canManage && (
        <div className="card p-6">
          <h2 className="text-base font-semibold mb-1">Log Stone Stock</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Record incoming stone stock — no separate catalog step required.
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Stone Type</label>
                {!addingNewType ? (
                  <div className="flex gap-2">
                    <select
                      className={fieldClass}
                      value={form.stoneTypeId}
                      onChange={(e) =>
                        setForm({ ...form, stoneTypeId: e.target.value })
                      }
                      required
                    >
                      <option value="">Select stone type…</option>
                      {stoneTypes.map((type) => (
                        <option key={type.id} value={type.id}>
                          {type.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      className="btn-secondary px-3 py-2 text-sm whitespace-nowrap"
                      onClick={() => {
                        setAddingNewType(true);
                        setForm({ ...form, stoneTypeId: "" });
                      }}
                    >
                      + New
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className={fieldClass}
                      value={form.newStoneTypeName}
                      onChange={(e) =>
                        setForm({ ...form, newStoneTypeName: e.target.value })
                      }
                      placeholder="e.g. Lapis, Coral…"
                      autoFocus
                    />
                    <button
                      type="button"
                      className="btn-secondary px-3 py-2 text-sm whitespace-nowrap"
                      onClick={() => {
                        setAddingNewType(false);
                        setForm({ ...form, newStoneTypeName: "" });
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className={labelClass}>Supplier Name</label>
                <input
                  className={fieldClass}
                  value={form.vendorName}
                  onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                  placeholder="Vendor / supplier"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Pieces (optional)</label>
                <input
                  type="number"
                  min={1}
                  className={fieldClass}
                  value={form.qtyPurchased}
                  onChange={(e) =>
                    setForm({ ...form, qtyPurchased: e.target.value })
                  }
                  placeholder="e.g. 100"
                />
              </div>
              <div>
                <label className={labelClass}>Weight in carats (optional)</label>
                <input
                  type="number"
                  step="0.0001"
                  min={0}
                  className={fieldClass}
                  value={form.weightPurchased}
                  onChange={(e) =>
                    setForm({ ...form, weightPurchased: e.target.value })
                  }
                  placeholder="e.g. 12.5"
                />
              </div>
              <div>
                <label className={labelClass}>
                  Rate per {rateUnit}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={fieldClass}
                  value={form.purchaseRate}
                  onChange={(e) =>
                    setForm({ ...form, purchaseRate: e.target.value })
                  }
                  required
                />
              </div>
            </div>

            <p className="text-xs text-zinc-500">
              At least one of pieces or weight is required. Rate applies to whichever
              quantity you enter (pieces take priority if both are filled).
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Date Added</label>
                <input
                  type="date"
                  className={fieldClass}
                  value={form.invoiceDate}
                  onChange={(e) => setForm({ ...form, invoiceDate: e.target.value })}
                />
              </div>
              <div>
                <label className={labelClass}>
                  Lot / Reference No. (optional)
                </label>
                <input
                  className={fieldClass}
                  value={form.lotNo}
                  onChange={(e) => setForm({ ...form, lotNo: e.target.value })}
                  placeholder={previewLotNo}
                />
                <p className="text-xs text-zinc-400 mt-1">
                  Auto: {displayedLotNo}
                </p>
              </div>
            </div>

            {entryValuePreview > 0 && (
              <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-4 py-3 text-sm">
                Entry value:{" "}
                <span className="font-semibold">
                  ₹{entryValuePreview.toLocaleString("en-IN")}
                </span>
              </div>
            )}

            {formError && <p className="text-xs text-red-500">{formError}</p>}

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={submitting}
                className="btn-primary px-5 py-2 text-sm"
              >
                {submitting ? "Saving…" : "Log Stone Stock"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search lot, stone, supplier…"
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
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-zinc-500 text-xs uppercase">
            <tr>
              <th className="text-left px-4 py-3">Ref No</th>
              <th className="text-left px-4 py-3">Stone</th>
              <th className="text-left px-4 py-3">Supplier</th>
              <th className="text-left px-4 py-3">Date</th>
              <th className="text-right px-4 py-3">Received</th>
              <th className="text-right px-4 py-3">Balance</th>
              <th className="text-right px-4 py-3">Rate</th>
              <th className="text-left px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {lots.map((lot) => (
              <tr
                key={lot.id}
                className="border-t border-zinc-100 hover:bg-zinc-50/80 cursor-pointer"
                onClick={() => router.push(`/stone-master/lots/${lot.id}`)}
              >
                <td className="px-4 py-3 font-mono text-xs">{lot.lotNo}</td>
                <td className="px-4 py-3">
                  {lot.stoneMaster?.stoneMaterial ?? lot.stoneMaster?.stoneName ?? "—"}
                </td>
                <td className="px-4 py-3">{lot.vendorName}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {lot.invoiceDate.slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">{formatPurchased(lot)}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatBalance(lot)}
                </td>
                <td className="px-4 py-3 text-right">{formatRate(lot)}</td>
                <td className="px-4 py-3">{lot.status}</td>
              </tr>
            ))}
            {lots.length === 0 && !loading && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-zinc-400">
                  No stone stock logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
