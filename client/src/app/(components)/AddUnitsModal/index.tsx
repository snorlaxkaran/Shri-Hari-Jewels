"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { InventoryItem } from "@/lib/types";
import { generateUnitCodes } from "@/lib/inventory/sku";
import { getApiErrorMessage } from "@/lib/api/client";

type AddUnitsModalProps = {
  open: boolean;
  product: InventoryItem;
  existingUnitCodes: string[];
  onClose: () => void;
  onSubmit: (quantity: number) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function AddUnitsModal({
  open,
  product,
  existingUnitCodes,
  onClose,
  onSubmit,
}: AddUnitsModalProps) {
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!open) return null;

  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const previewCodes = generateUnitCodes(product.sku, qty, existingUnitCodes);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!qty || qty < 1 || qty > 999) {
      setError("Quantity must be between 1 and 999.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit(qty);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">Add Units</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <p className="text-sm text-zinc-600">
            Add more inventory units to <span className="font-medium">{product.name}</span> ({product.sku})
          </p>
          <div>
            <label className={labelClass}>Quantity to add *</label>
            <input
              type="number"
              min={1}
              max={999}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className={fieldClass}
              autoFocus
            />
          </div>
          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg border border-zinc-200 bg-zinc-50">
            {previewCodes.map((code) => (
              <span key={code} className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-700">
                {code}
              </span>
            ))}
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 px-4 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
              {submitting ? "Adding…" : "Add Units"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
