"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { MetalLot, Purity, UpdateMetalLotInput } from "@/lib/types";
import { RAW_PURITIES, STOCK_LOCATIONS } from "@/lib/raw-inventory/constants";
import { getApiErrorMessage } from "@/lib/api/client";

type EditMetalLotModalProps = {
  open: boolean;
  lot: MetalLot | null;
  onClose: () => void;
  onSubmit: (id: string, input: UpdateMetalLotInput) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function EditMetalLotModal({
  open,
  lot,
  onClose,
  onSubmit,
}: EditMetalLotModalProps) {
  const [purity, setPurity] = useState<Purity>("22K");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [currentRate, setCurrentRate] = useState("");
  const [vendor, setVendor] = useState("");
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !lot) return;
    setPurity(lot.purity);
    setPurchaseRate(String(lot.purchaseRate));
    setCurrentRate(String(lot.currentRate));
    setVendor(lot.vendor);
    setLocation(lot.location);
    setNotes(lot.notes ?? "");
    setError("");
  }, [open, lot]);

  if (!open || !lot) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await onSubmit(lot.id, {
        purity,
        purchaseRate: parseFloat(purchaseRate),
        currentRate: parseFloat(currentRate),
        vendor: vendor.trim(),
        location,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update metal lot."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Edit Metal Lot</h2>
            <p className="text-xs text-zinc-400">{lot.lotNumber}</p>
          </div>
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
          <div>
            <label className={labelClass}>Purity</label>
            <select
              className={fieldClass}
              value={purity}
              onChange={(e) => setPurity(e.target.value as Purity)}
            >
              {RAW_PURITIES.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Purchase Rate (₹/g)</label>
              <input
                type="number"
                step="0.01"
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
                required
                className={fieldClass}
                value={currentRate}
                onChange={(e) => setCurrentRate(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className={labelClass}>Vendor</label>
            <input required className={fieldClass} value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div>
            <label className={labelClass}>Location</label>
            <select className={fieldClass} value={location} onChange={(e) => setLocation(e.target.value)}>
              {STOCK_LOCATIONS.map((loc) => (
                <option key={loc} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea className={fieldClass} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2 text-sm">
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
