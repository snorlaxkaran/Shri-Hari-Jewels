"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { InventoryItem } from "@/lib/types";
import { generateUnitCodes } from "@/lib/inventory/sku";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type AddUnitsFormProps = {
  product: InventoryItem;
  existingUnitCodes: string[];
  cancelHref: string;
  onCancelClick?: () => void;
  onSubmit: (quantity: number) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

export default function AddUnitsForm({
  product,
  existingUnitCodes,
  cancelHref,
  onCancelClick,
  onSubmit,
  onDirtyChange,
}: AddUnitsFormProps) {
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

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
      setDirty(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="surface-card p-5 space-y-4">
        <p className="text-sm text-zinc-600">
          Add more inventory units to{" "}
          <span className="font-medium">{product.name}</span> ({product.sku})
        </p>
        <div>
          <label className={labelClass}>Quantity to add *</label>
          <input
            type="number"
            min={1}
            max={999}
            value={quantity}
            onChange={(e) => {
              setQuantity(e.target.value);
              setDirty(true);
            }}
            className={fieldClass}
            autoFocus
          />
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-2">Item codes to be created</p>
          <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 rounded-lg border border-zinc-200 bg-zinc-50">
            {previewCodes.map((code) => (
              <span
                key={code}
                className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-700"
              >
                {code}
              </span>
            ))}
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        {onCancelClick ? (
          <button
            type="button"
            onClick={onCancelClick}
            className="btn-secondary flex-1 px-4 py-2.5 text-sm"
          >
            Cancel
          </button>
        ) : (
          <Link href={cancelHref} className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center">
            Cancel
          </Link>
        )}
        <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
          {submitting ? "Adding…" : "Add Units"}
        </button>
      </div>
    </form>
  );
}
