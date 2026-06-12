"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { STOCK_LOCATIONS } from "@/lib/raw-inventory/constants";
import { getApiErrorMessage } from "@/lib/api/client";

type RawStockActionModalProps = {
  open: boolean;
  mode: "transfer" | "adjust";
  stockKind: "metal" | "stone";
  lotRef: string;
  currentValue: number;
  currentLocation?: string;
  unitLabel: string;
  onClose: () => void;
  onTransfer: (input: { toLocation: string; reason?: string }) => Promise<void>;
  onAdjust: (input: { value: number; reason: string }) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function RawStockActionModal({
  open,
  mode,
  stockKind,
  lotRef,
  currentValue,
  currentLocation,
  unitLabel,
  onClose,
  onTransfer,
  onAdjust,
}: RawStockActionModalProps) {
  const [toLocation, setToLocation] = useState<string>(STOCK_LOCATIONS[0]);
  const [newValue, setNewValue] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setToLocation(
      STOCK_LOCATIONS.find((l) => l !== currentLocation) ?? STOCK_LOCATIONS[0],
    );
    setNewValue(String(currentValue));
    setReason("");
    setError("");
  }, [open, currentValue, currentLocation]);

  if (!open) return null;

  const title =
    mode === "transfer"
      ? `Transfer ${stockKind === "metal" ? "Metal" : "Stone"} Lot`
      : `Adjust ${stockKind === "metal" ? "Metal" : "Stone"} Stock`;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      if (mode === "transfer") {
        await onTransfer({
          toLocation,
          reason: reason.trim() || undefined,
        });
      } else {
        await onAdjust({
          value: parseFloat(newValue),
          reason: reason.trim(),
        });
      }
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Action failed."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-xl shadow-2xl border border-zinc-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
            <p className="text-xs text-zinc-400 mt-0.5">{lotRef}</p>
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
          {mode === "transfer" ? (
            <>
              <div>
                <label className={labelClass}>Current Location</label>
                <input className={fieldClass} value={currentLocation ?? ""} disabled />
              </div>
              <div>
                <label className={labelClass}>Transfer To</label>
                <select
                  className={fieldClass}
                  value={toLocation}
                  onChange={(e) => setToLocation(e.target.value)}
                >
                  {STOCK_LOCATIONS.filter((l) => l !== currentLocation).map((loc) => (
                    <option key={loc} value={loc}>{loc}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Reason (optional)</label>
                <input className={fieldClass} value={reason} onChange={(e) => setReason(e.target.value)} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className={labelClass}>Current {unitLabel}</label>
                <input className={fieldClass} value={currentValue} disabled />
              </div>
              <div>
                <label className={labelClass}>New {unitLabel}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className={fieldClass}
                  value={newValue}
                  onChange={(e) => setNewValue(e.target.value)}
                />
              </div>
              <div>
                <label className={labelClass}>Reason</label>
                <input
                  required
                  className={fieldClass}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="e.g. Wastage, Melting loss, Re-weigh"
                />
              </div>
            </>
          )}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 py-2 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 py-2 text-sm">
              {submitting ? "Saving…" : mode === "transfer" ? "Transfer" : "Adjust"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
