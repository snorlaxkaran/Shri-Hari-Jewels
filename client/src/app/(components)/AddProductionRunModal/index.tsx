"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { fetchProductionRunPreview } from "@/lib/api/production-runs";
import type { Design, NewProductionRunInput, ProductionRunPreview } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

type AddProductionRunModalProps = {
  open: boolean;
  onClose: () => void;
  designs: Design[];
  onSubmit: (input: NewProductionRunInput) => Promise<void>;
  initialDesignId?: string;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function AddProductionRunModal({
  open,
  onClose,
  designs,
  onSubmit,
  initialDesignId,
}: AddProductionRunModalProps) {
  const [designId, setDesignId] = useState("");
  const [setsOrdered, setSetsOrdered] = useState("1");
  const [preview, setPreview] = useState<ProductionRunPreview | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const designsWithElements = designs.filter((d) => d.elements.length > 0);

  useEffect(() => {
    if (!open) return;
    if (initialDesignId) {
      setDesignId(initialDesignId);
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting, initialDesignId]);

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
    if (!open || !designId) {
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
  }, [open, designId, setsOrdered, loadPreview]);

  const reset = () => {
    setDesignId("");
    setSetsOrdered("1");
    setPreview(null);
    setError("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

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

    setSubmitting(true);
    try {
      await onSubmit({ designId, setsOrdered: sets });
      reset();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create production run."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const metalWarning = preview?.metalStockWarning;
  const stoneWarnings = preview?.stoneStockWarnings ?? [];
  const stoneRequirements = preview?.stoneRequirements ?? [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg rounded-xl border border-zinc-200 bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200">
          <h2 className="text-base font-semibold text-zinc-900">
            New Production Run
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Design *</label>
            <select
              value={designId}
              onChange={(e) => setDesignId(e.target.value)}
              className={fieldClass}
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
                No designs with elements available. Add a bill of materials
                first.
              </p>
            )}
          </div>
          <div>
            <label className={labelClass}>Sets Ordered *</label>
            <input
              type="number"
              min={1}
              value={setsOrdered}
              onChange={(e) => setSetsOrdered(e.target.value)}
              className={fieldClass}
            />
          </div>

          {previewLoading && (
            <p className="text-xs text-zinc-400">Checking raw inventory…</p>
          )}

          {metalWarning && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
              <p className="font-medium">Insufficient gold/metal stock</p>
              <p className="mt-1">
                You requested <strong>{metalWarning.requestedSets} sets</strong>{" "}
                but only have enough {metalWarning.metal} {metalWarning.purity}{" "}
                for <strong>{metalWarning.maxSets} set{metalWarning.maxSets !== 1 ? "s" : ""}</strong>.
              </p>
              <p className="mt-1 text-xs text-red-700">
                Need {metalWarning.requiredGrams}g · Available{" "}
                {metalWarning.availableGrams}g · Short by{" "}
                {metalWarning.shortfallGrams}g ({metalWarning.perSetGrams}g per
                set)
              </p>
            </div>
          )}

          {stoneRequirements.length > 0 && (
            <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
              <p className="font-medium text-zinc-900">
                Stone requirements (from design BOM)
              </p>
              <ul className="mt-2 space-y-1 text-xs">
                {stoneRequirements.map((req) => (
                  <li key={req.stoneMasterId}>
                    {req.stoneName}: {req.required} pcs
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-zinc-500">
                Stone counts and carat will be pre-filled on the production run
                from this BOM.
              </p>
            </div>
          )}

          {stoneWarnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              <p className="font-medium">Stone stock warning</p>
              <ul className="mt-1 space-y-1 text-xs">
                {stoneWarnings.map((w) => (
                  <li key={w.stoneMasterId}>
                    {w.stoneName}: need {w.required}, have {w.available}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="btn-secondary flex-1 px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || designsWithElements.length === 0}
              className="btn-primary flex-1 px-4 py-2.5 text-sm"
            >
              {submitting ? "Creating…" : "Start Run"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
