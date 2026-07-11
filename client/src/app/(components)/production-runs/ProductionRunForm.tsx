"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { fetchProductionRunPreview } from "@/lib/api/production-runs";
import type { Design, NewProductionRunInput, ProductionRunPreview } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type ProductionRunFormProps = {
  designs: Design[];
  cancelHref: string;
  onCancelClick?: () => void;
  initialDesignId?: string;
  onSubmit: (input: NewProductionRunInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

export default function ProductionRunForm({
  designs,
  cancelHref,
  onCancelClick,
  initialDesignId,
  onSubmit,
  onDirtyChange,
}: ProductionRunFormProps) {
  const [designId, setDesignId] = useState(initialDesignId ?? "");
  const [setsOrdered, setSetsOrdered] = useState("1");
  const [preview, setPreview] = useState<ProductionRunPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  const designsWithElements = designs.filter((d) => d.elements.length > 0);

  useEffect(() => {
    if (initialDesignId) {
      setDesignId(initialDesignId);
    }
  }, [initialDesignId]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const loadPreview = useCallback(async (selectedDesignId: string, sets: number) => {
    if (!selectedDesignId || sets < 1) {
      setPreview(null);
      return;
    }
    setPreviewLoading(true);
    try {
      const data = await fetchProductionRunPreview(selectedDesignId, sets);
      setPreview(data);
    } catch {
      setPreview(null);
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!designId) {
      setPreview(null);
      return;
    }
    const sets = parseInt(setsOrdered, 10);
    if (!sets || sets < 1) {
      setPreview(null);
      return;
    }
    const timer = window.setTimeout(() => {
      void loadPreview(designId, sets);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [designId, setsOrdered, loadPreview]);

  const markDirty = () => setDirty(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!designId) {
      setError("Please select a design.");
      return;
    }
    const sets = parseInt(setsOrdered, 10);
    if (!sets || sets < 1) {
      setError("Sets ordered must be at least 1.");
      return;
    }
    if (metalWarning) {
      setError(
        `Insufficient metal stock: need ${metalWarning.requiredGrams}g of ${metalWarning.metal} ${metalWarning.purity} for ${sets} sets (${metalWarning.perSetGrams}g per set), but only ${metalWarning.availableGrams}g is available.`,
      );
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({ designId, setsOrdered: sets });
      setDirty(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create production run."));
    } finally {
      setSubmitting(false);
    }
  };

  const metalWarning = preview?.metalStockWarning;
  const stoneWarnings = preview?.stoneStockWarnings ?? [];
  const stoneRequirements = preview?.stoneRequirements ?? [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="surface-card p-5 space-y-4">
        <div>
          <label className={labelClass}>Design *</label>
          <select
            value={designId}
            onChange={(e) => {
              setDesignId(e.target.value);
              markDirty();
            }}
            className={fieldClass}
            autoFocus
          >
            <option value="">Select design</option>
            {designsWithElements.map((design) => (
              <option key={design.id} value={design.id}>
                {design.code}
                {design.name ? ` — ${design.name}` : ""}
                {design.category ? ` (${design.category})` : ""}
              </option>
            ))}
          </select>
          {designsWithElements.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">
              No designs with elements available. Add a bill of materials first.
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Sets Ordered *</label>
          <input
            type="number"
            min={1}
            value={setsOrdered}
            onChange={(e) => {
              setSetsOrdered(e.target.value);
              markDirty();
            }}
            className={fieldClass}
          />
        </div>

        {previewLoading && (
          <p className="text-xs text-zinc-400">Checking raw inventory…</p>
        )}

        {metalWarning && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <p className="font-medium">Insufficient metal stock — cannot start this run</p>
            <p className="mt-1">
              You requested <strong>{metalWarning.requestedSets} sets</strong> but only have enough{" "}
              {metalWarning.metal} {metalWarning.purity} for{" "}
              <strong>
                {metalWarning.maxSets} set{metalWarning.maxSets !== 1 ? "s" : ""}
              </strong>
              .
            </p>
            <p className="mt-2 text-xs text-red-700">
              Metal is reserved from Raw Inventory as soon as you start the run
              ({metalWarning.perSetGrams}g × {metalWarning.requestedSets} sets ={" "}
              {metalWarning.requiredGrams}g total).
            </p>
          </div>
        )}

        {stoneRequirements.length > 0 && (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">Stone requirements (from design BOM)</p>
            <ul className="mt-2 space-y-1 text-xs">
              {stoneRequirements.map((req) => (
                <li key={req.stoneType}>
                  {req.stoneType}: {req.required} pcs
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-zinc-500">
              Stone counts and carat will be pre-filled on the production run from this BOM.
            </p>
          </div>
        )}

        {stoneWarnings.length > 0 && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-medium">Stone stock warning</p>
            <ul className="mt-1 space-y-1 text-xs">
              {stoneWarnings.map((w) => (
                <li key={w.stoneType}>
                  {w.stoneType}: need {w.required}, have {w.available}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        {onCancelClick ? (
          <button type="button" onClick={onCancelClick} className="btn-secondary flex-1 px-4 py-2.5 text-sm">
            Cancel
          </button>
        ) : (
          <Link href={cancelHref} className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center">
            Cancel
          </Link>
        )}
        <button
          type="submit"
          disabled={submitting || designsWithElements.length === 0 || !!metalWarning}
          className="btn-primary flex-1 px-4 py-2.5 text-sm"
        >
          {submitting ? "Creating…" : "Start Run"}
        </button>
      </div>
    </form>
  );
}
