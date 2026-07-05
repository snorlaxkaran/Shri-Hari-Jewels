"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createStoneType, fetchStoneTypes } from "@/lib/api/stone-types";
import {
  createStoneStock,
  fetchStoneStock,
  fetchStoneStockSummary,
} from "@/lib/api/stone-stock";
import { previewNextLotNo } from "@/lib/stones/lot-number";
import type {
  NewStoneStockInput,
  StoneStock,
  StoneStockSummaryCards,
  StoneType,
} from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type StoneStockPanelProps = {
  canManage: boolean;
};

type EntryFormState = {
  stoneTypeId: string;
  newStoneTypeName: string;
  pieces: string;
  weightCt: string;
  ratePerUnit: string;
  supplierName: string;
  purchaseDate: string;
  lotNo: string;
};

const emptyForm = (): EntryFormState => ({
  stoneTypeId: "",
  newStoneTypeName: "",
  pieces: "",
  weightCt: "",
  ratePerUnit: "",
  supplierName: "",
  purchaseDate: new Date().toISOString().slice(0, 10),
  lotNo: "",
});

export default function StoneStockPanel({ canManage }: StoneStockPanelProps) {
  const [rows, setRows] = useState<StoneStock[]>([]);
  const [summary, setSummary] = useState<StoneStockSummaryCards | null>(null);
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
      const [stockRows, summaryRows, typeRows] = await Promise.all([
        fetchStoneStock({
          status: statusFilter || undefined,
          search: search.trim() || undefined,
        }),
        fetchStoneStockSummary(),
        fetchStoneTypes(),
      ]);
      setRows(stockRows);
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

  const existingLotNos = useMemo(() => rows.map((r) => r.lotNo), [rows]);
  const previewLotNo = useMemo(
    () => previewNextLotNo(existingLotNos),
    [existingLotNos],
  );
  const displayedLotNo = form.lotNo.trim() || previewLotNo;

  const hasPieces = form.pieces.trim() !== "" && Number(form.pieces) > 0;
  const hasWeight = form.weightCt.trim() !== "" && Number(form.weightCt) > 0;
  const rateUnit = hasPieces ? "piece" : hasWeight ? "carat" : "unit";

  const entryValuePreview = useMemo(() => {
    const rate = parseFloat(form.ratePerUnit) || 0;
    if (hasPieces) return Math.round(Number(form.pieces) * rate * 100) / 100;
    if (hasWeight) return Math.round(Number(form.weightCt) * rate * 100) / 100;
    return 0;
  }, [form.ratePerUnit, form.pieces, form.weightCt, hasPieces, hasWeight]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManage) return;
    setFormError("");

    if (!hasPieces && !hasWeight) {
      setFormError("Enter pieces or weight — at least one is required.");
      return;
    }
    if (!form.supplierName.trim()) {
      setFormError("Supplier name is required.");
      return;
    }
    const rate = parseFloat(form.ratePerUnit);
    if (Number.isNaN(rate) || rate < 0) {
      setFormError("Rate is required.");
      return;
    }

    setSubmitting(true);
    try {
      let stoneTypeId = form.stoneTypeId || undefined;

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

      const payload: NewStoneStockInput = {
        stoneTypeId,
        lotNo: form.lotNo.trim() || undefined,
        pieces: hasPieces ? parseInt(form.pieces, 10) : undefined,
        weightCt: hasWeight ? parseFloat(form.weightCt) : undefined,
        ratePerUnit: rate,
        supplierName: form.supplierName.trim(),
        purchaseDate: form.purchaseDate || undefined,
      };

      await createStoneStock(payload);
      setForm(emptyForm());
      void load();
    } catch (err) {
      setFormError(getApiErrorMessage(err, "Failed to log stone stock."));
    } finally {
      setSubmitting(false);
    }
  };

  const formatBalance = (row: StoneStock) => {
    if (row.rateBasis === "Carat" && row.currentWeightCt > 0) {
      return `${row.currentWeightCt.toFixed(2)} ct`;
    }
    if (row.currentPieces > 0) return `${row.currentPieces} pcs`;
    if (row.currentWeightCt > 0) return `${row.currentWeightCt.toFixed(2)} ct`;
    return "—";
  };

  const formatReceived = (row: StoneStock) => {
    const parts: string[] = [];
    if (row.pieces && row.pieces > 0) parts.push(`${row.pieces} pcs`);
    if (row.weightCt && row.weightCt > 0) parts.push(`${row.weightCt.toFixed(2)} ct`);
    return parts.length ? parts.join(" · ") : "—";
  };

  const formatRate = (row: StoneStock) => {
    const unit = row.rateBasis === "Carat" ? "ct" : "pc";
    return `₹${row.ratePerUnit}/${unit}`;
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
            {summary.activeEntries} active entries · {summary.totalEntries} total
          </p>
        </div>
      )}

      {canManage && (
        <div className="card p-6">
          <h2 className="text-base font-semibold mb-1">Log Stone Stock</h2>
          <p className="text-sm text-zinc-500 mb-4">
            Record incoming stone stock by type — no catalog setup required.
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
                  value={form.supplierName}
                  onChange={(e) => setForm({ ...form, supplierName: e.target.value })}
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
                  value={form.pieces}
                  onChange={(e) => setForm({ ...form, pieces: e.target.value })}
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
                  value={form.weightCt}
                  onChange={(e) => setForm({ ...form, weightCt: e.target.value })}
                  placeholder="e.g. 12.5"
                />
              </div>
              <div>
                <label className={labelClass}>Rate per {rateUnit}</label>
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  className={fieldClass}
                  value={form.ratePerUnit}
                  onChange={(e) =>
                    setForm({ ...form, ratePerUnit: e.target.value })
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
                  value={form.purchaseDate}
                  onChange={(e) =>
                    setForm({ ...form, purchaseDate: e.target.value })
                  }
                />
              </div>
              <div>
                <label className={labelClass}>Lot / Reference No. (optional)</label>
                <input
                  className={fieldClass}
                  value={form.lotNo}
                  onChange={(e) => setForm({ ...form, lotNo: e.target.value })}
                  placeholder={previewLotNo}
                />
                <p className="text-xs text-zinc-400 mt-1">Auto: {displayedLotNo}</p>
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
          placeholder="Search ref, stone type, supplier…"
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
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-zinc-100">
                <td className="px-4 py-3 font-mono text-xs">{row.lotNo}</td>
                <td className="px-4 py-3">{row.stoneType}</td>
                <td className="px-4 py-3">{row.supplierName}</td>
                <td className="px-4 py-3 text-zinc-500">
                  {row.purchaseDate.slice(0, 10)}
                </td>
                <td className="px-4 py-3 text-right">{formatReceived(row)}</td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatBalance(row)}
                </td>
                <td className="px-4 py-3 text-right">{formatRate(row)}</td>
                <td className="px-4 py-3">{row.status}</td>
              </tr>
            ))}
            {rows.length === 0 && !loading && (
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
