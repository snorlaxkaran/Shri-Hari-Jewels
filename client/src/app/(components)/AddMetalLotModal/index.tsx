"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { NewMetalLotInput, Purity, RawMetalType } from "@/lib/types";
import {
  RAW_METAL_TYPES,
  RAW_PURITIES,
  STOCK_LOCATIONS,
} from "@/lib/raw-inventory/constants";
import { getApiErrorMessage } from "@/lib/api/client";

type AddMetalLotModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewMetalLotInput) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function AddMetalLotModal({
  open,
  onClose,
  onSubmit,
}: AddMetalLotModalProps) {
  const [metalType, setMetalType] = useState<RawMetalType>("Gold");
  const [purity, setPurity] = useState<Purity>("22K");
  const [weightGrams, setWeightGrams] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [currentRate, setCurrentRate] = useState("");
  const [vendor, setVendor] = useState("");
  const [location, setLocation] = useState<string>(STOCK_LOCATIONS[0]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMetalType("Gold");
    setPurity("22K");
    setWeightGrams("");
    setPurchaseRate("");
    setCurrentRate("");
    setVendor("");
    setLocation(STOCK_LOCATIONS[0]);
    setNotes("");
    setError("");
  }, [open]);

  useEffect(() => {
    if (metalType === "Silver" && purity !== "925") {
      setPurity("925");
    }
  }, [metalType, purity]);

  const availablePurities =
    metalType === "Silver" ? (["925"] as Purity[]) : RAW_PURITIES;

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        metalType,
        purity,
        weightGrams: parseFloat(weightGrams),
        purchaseRate: parseFloat(purchaseRate),
        currentRate: parseFloat(currentRate),
        vendor: vendor.trim(),
        location,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add metal lot."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-zinc-900">Add Metal Lot</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <p className="text-xs text-red-600 border border-red-200 bg-red-50 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Metal Type</label>
              <select
                className={fieldClass}
                value={metalType}
                onChange={(e) => setMetalType(e.target.value as RawMetalType)}
              >
                {RAW_METAL_TYPES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Purity</label>
              <select
                className={fieldClass}
                value={purity}
                onChange={(e) => setPurity(e.target.value as Purity)}
              >
                {availablePurities.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className={labelClass}>Weight (grams)</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              className={fieldClass}
              value={weightGrams}
              onChange={(e) => setWeightGrams(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Purchase Rate (₹/g)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className={fieldClass}
                value={purchaseRate}
                onChange={(e) => setPurchaseRate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Current Rate (₹/g)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                className={fieldClass}
                value={currentRate}
                onChange={(e) => setCurrentRate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Vendor</label>
            <input
              required
              className={fieldClass}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
            />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <select
              className={fieldClass}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              {STOCK_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea
              className={fieldClass}
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2 text-sm">
              {submitting ? "Saving…" : "Add Lot"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
