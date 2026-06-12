"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { StoneLot, StoneLotStatus, UpdateStoneLotInput } from "@/lib/types";
import { STONE_STATUSES, STOCK_LOCATIONS } from "@/lib/raw-inventory/constants";
import { getApiErrorMessage } from "@/lib/api/client";

type EditStoneLotModalProps = {
  open: boolean;
  lot: StoneLot | null;
  onClose: () => void;
  onSubmit: (id: string, input: UpdateStoneLotInput) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function EditStoneLotModal({
  open,
  lot,
  onClose,
  onSubmit,
}: EditStoneLotModalProps) {
  const [color, setColor] = useState("");
  const [clarity, setClarity] = useState("");
  const [cut, setCut] = useState("");
  const [vendor, setVendor] = useState("");
  const [purchaseRate, setPurchaseRate] = useState("");
  const [currentRate, setCurrentRate] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<StoneLotStatus>("In Stock");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open || !lot) return;
    setColor(lot.color ?? "");
    setClarity(lot.clarity ?? "");
    setCut(lot.cut ?? "");
    setVendor(lot.vendor);
    setPurchaseRate(lot.purchaseRate != null ? String(lot.purchaseRate) : "");
    setCurrentRate(lot.currentRate != null ? String(lot.currentRate) : "");
    setLocation(lot.location);
    setStatus(lot.status);
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
        color: color.trim() || null,
        clarity: clarity.trim() || null,
        cut: cut.trim() || null,
        vendor: vendor.trim(),
        purchaseRate: purchaseRate ? parseFloat(purchaseRate) : null,
        currentRate: currentRate ? parseFloat(currentRate) : null,
        location,
        status,
        notes: notes.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to update stone lot."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl border border-zinc-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Edit Stone Lot</h2>
            <p className="text-xs text-zinc-400">{lot.certificateNumber}</p>
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
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelClass}>Color</label>
              <input className={fieldClass} value={color} onChange={(e) => setColor(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Clarity</label>
              <input className={fieldClass} value={clarity} onChange={(e) => setClarity(e.target.value)} />
            </div>
            <div>
              <label className={labelClass}>Cut</label>
              <input className={fieldClass} value={cut} onChange={(e) => setCut(e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Vendor</label>
            <input required className={fieldClass} value={vendor} onChange={(e) => setVendor(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Purchase Rate (₹/ct)</label>
              <input
                type="number"
                step="0.01"
                className={fieldClass}
                value={purchaseRate}
                onChange={(e) => setPurchaseRate(e.target.value)}
              />
            </div>
            <div>
              <label className={labelClass}>Current Rate (₹/ct)</label>
              <input
                type="number"
                step="0.01"
                className={fieldClass}
                value={currentRate}
                onChange={(e) => setCurrentRate(e.target.value)}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass}>Location</label>
              <select className={fieldClass} value={location} onChange={(e) => setLocation(e.target.value)}>
                {STOCK_LOCATIONS.map((loc) => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Status</label>
              <select
                className={fieldClass}
                value={status}
                onChange={(e) => setStatus(e.target.value as StoneLotStatus)}
              >
                {STONE_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
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
