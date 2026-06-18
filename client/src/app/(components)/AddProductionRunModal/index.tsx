"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Design, NewProductionRunInput } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

type AddProductionRunModalProps = {
  open: boolean;
  onClose: () => void;
  designs: Design[];
  onSubmit: (input: NewProductionRunInput) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function AddProductionRunModal({
  open,
  onClose,
  designs,
  onSubmit,
}: AddProductionRunModalProps) {
  const [designId, setDesignId] = useState("");
  const [setsOrdered, setSetsOrdered] = useState("1");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const designsWithElements = designs.filter((d) => d.elements.length > 0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  const reset = () => {
    setDesignId("");
    setSetsOrdered("1");
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl">
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
