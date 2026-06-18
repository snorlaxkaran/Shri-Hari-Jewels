"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type {
  FinishedGoodsDefaults,
  FinishedGoodsInput,
  MetalType,
  Purity,
} from "@/lib/types";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/inventory/categories";
import { formatCurrency } from "@/lib/format";
import { getApiErrorMessage } from "@/lib/api/client";

type CompleteProductionRunModalProps = {
  open: boolean;
  runId: string;
  defaults: FinishedGoodsDefaults | null;
  onClose: () => void;
  onConfirm: (finishedGoods: FinishedGoodsInput) => Promise<void>;
};

const METALS: MetalType[] = ["Gold", "Silver", "Platinum", "Rose Gold"];
const PURITIES: Purity[] = ["24K", "22K", "18K", "14K", "925"];
const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function CompleteProductionRunModal({
  open,
  runId,
  defaults,
  onClose,
  onConfirm,
}: CompleteProductionRunModalProps) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Others");
  const [metal, setMetal] = useState<MetalType>("Gold");
  const [purity, setPurity] = useState<Purity>("22K");
  const [weightGrams, setWeightGrams] = useState("");
  const [makingCharges, setMakingCharges] = useState("");
  const [stoneCarat, setStoneCarat] = useState("");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!defaults) return;
    setName(defaults.name);
    setCategory(defaults.category as ProductCategory);
    setMetal(defaults.metal);
    setPurity(defaults.purity);
    setWeightGrams(defaults.weightGrams ? String(defaults.weightGrams) : "0");
    setMakingCharges(String(defaults.makingCharges ?? 0));
    setStoneCarat(
      defaults.stoneCarat !== undefined ? String(defaults.stoneCarat) : "",
    );
    setPrice(defaults.price ? String(defaults.price) : "0");
    setError("");
  }, [defaults, runId]);

  if (!open || !defaults) return null;

  const breakdown = defaults.priceBreakdown;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const weight = parseFloat(weightGrams);
    const charges = parseFloat(makingCharges);
    const listPrice = parseFloat(price);
    const carat = stoneCarat === "" ? undefined : parseFloat(stoneCarat);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
    if (Number.isNaN(weight) || weight < 0) {
      setError("Weight cannot be negative.");
      return;
    }
    if (Number.isNaN(charges) || charges < 0) {
      setError("Making charges cannot be negative.");
      return;
    }
    if (!listPrice || listPrice <= 0) {
      setError("Price must be greater than zero. Add BOM values on the design page.");
      return;
    }

    setSubmitting(true);
    try {
      await onConfirm({
        name: name.trim(),
        category,
        metal,
        purity,
        weightGrams: weight,
        makingCharges: charges,
        stoneCarat: carat,
        price: listPrice,
        images: [],
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to complete production run."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" aria-hidden />
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">
              Complete run & add to inventory
            </h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              {defaults.runNo} · {defaults.designCode} · {defaults.quantity} set
              {defaults.quantity !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-3">
          {breakdown && (
            <div className="rounded-lg border border-emerald-100 bg-emerald-50/60 p-3 space-y-2">
              <p className="text-xs font-medium text-emerald-800">
                Auto-calculated from design BOM & metal rates
              </p>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-emerald-900">
                <span>Metal ({breakdown.weightGrams}g × {formatCurrency(breakdown.metalRatePerGram)}/g)</span>
                <span className="text-right">{formatCurrency(breakdown.metalValue)}</span>
                {breakdown.components.map((component) => (
                  <div key={component.name} className="contents">
                    <span>
                      {component.name} ({component.qtyPerSet} × {formatCurrency(component.unitValue)})
                    </span>
                    <span className="text-right">
                      {formatCurrency(component.lineValue)}
                    </span>
                  </div>
                ))}
                <span>Making charges</span>
                <span className="text-right">{formatCurrency(breakdown.makingCharges)}</span>
                <span className="font-semibold pt-1 border-t border-emerald-200">List price</span>
                <span className="font-semibold text-right pt-1 border-t border-emerald-200">
                  {formatCurrency(breakdown.totalPrice)}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className={labelClass}>Product name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className={fieldClass}
              >
                {PRODUCT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Metal *</label>
              <select
                value={metal}
                onChange={(e) => setMetal(e.target.value as MetalType)}
                className={fieldClass}
              >
                {METALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Purity *</label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value as Purity)}
                className={fieldClass}
              >
                {PURITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Weight (g)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Making charges</label>
              <input
                type="number"
                min={0}
                value={makingCharges}
                onChange={(e) => setMakingCharges(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Stone carat</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={stoneCarat}
                onChange={(e) => setStoneCarat(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>List price (INR) *</label>
            <input
              type="number"
              min={0}
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={fieldClass}
            />
            <p className="text-[11px] text-zinc-400 mt-1">
              Pre-filled from BOM. You can override if needed.
            </p>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary flex-1 px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 px-4 py-2.5 text-sm"
            >
              {submitting ? "Completing…" : "Complete & add to inventory"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
