"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import MotifImageUpload from "@/app/(components)/motifs/MotifImageUpload";
import { createMotif } from "@/lib/api/motifs";
import {
  designMetalToMotifMetal,
  puritiesForMotifMetal,
} from "@/lib/motifs/constants";
import type { DesignElementType, MetalType, MotifMetal, Purity } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

export type AddMotifInput = {
  name: string;
  type: DesignElementType;
  unitValue?: number;
  weightGramsPerPc?: number;
  libraryMotifId?: string;
};

type AddMotifModalProps = {
  open: boolean;
  skuCode?: string;
  designMetal?: MetalType | "";
  designPurity?: Purity | "";
  onClose: () => void;
  onSubmit: (input: AddMotifInput) => Promise<void>;
  onMotifCreated?: () => void;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function AddMotifModal({
  open,
  skuCode,
  designMetal = "",
  designPurity = "",
  onClose,
  onSubmit,
  onMotifCreated,
}: AddMotifModalProps) {
  const [name, setName] = useState("");
  const [type, setType] = useState<DesignElementType>("Motif");
  const [price, setPrice] = useState("");
  const [weight, setWeight] = useState("");
  const [motifWeight, setMotifWeight] = useState("");
  const [imageUrl, setImageUrl] = useState<string | undefined>();
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const motifMetal = designMetalToMotifMetal(designMetal);
  const lockedMetalPurity = Boolean(motifMetal && designPurity);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  const reset = () => {
    setName("");
    setType("Motif");
    setPrice("");
    setWeight("");
    setMotifWeight("");
    setImageUrl(undefined);
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

    const trimmed = name.trim();
    if (!trimmed) {
      setError("Name is required.");
      return;
    }

    if (type === "Motif" && (!motifMetal || !designPurity)) {
      setError("Select metal and purity on the design before adding a motif.");
      return;
    }

    let unitValue: number | undefined;
    if (price.trim()) {
      unitValue = parseFloat(price);
      if (Number.isNaN(unitValue) || unitValue < 0) {
        setError("Enter a valid price.");
        return;
      }
    }

    let weightGramsPerPc: number | undefined;
    if (type === "Casting" && weight.trim()) {
      weightGramsPerPc = parseFloat(weight);
      if (Number.isNaN(weightGramsPerPc) || weightGramsPerPc < 0) {
        setError("Enter a valid weight.");
        return;
      }
    }

    let motifWeightGrams: number | undefined;
    if (type === "Motif" && motifWeight.trim()) {
      motifWeightGrams = parseFloat(motifWeight);
      if (Number.isNaN(motifWeightGrams) || motifWeightGrams < 0) {
        setError("Enter a valid motif weight.");
        return;
      }
    }

    setSubmitting(true);
    try {
      if (type === "Motif" && motifMetal && designPurity) {
        const created = await createMotif({
          name: trimmed,
          metal: motifMetal as MotifMetal,
          purity: designPurity,
          subCategory: "Contemporary",
          price: unitValue,
          weightGrams: motifWeightGrams,
          imageUrl,
        });
        onMotifCreated?.();

        await onSubmit({
          name: trimmed,
          type,
          unitValue,
          weightGramsPerPc: motifWeightGrams,
          libraryMotifId: created.id,
        });
        reset();
        onClose();
        return;
      }

      await onSubmit({
        name: trimmed,
        type,
        unitValue: type !== "Casting" ? unitValue : undefined,
        weightGramsPerPc:
          type === "Casting"
            ? weightGramsPerPc
            : type === "Motif"
              ? motifWeightGrams
              : undefined,
      });
      reset();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add motif."));
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
          <div>
            <h2 className="text-base font-semibold text-zinc-900">New motif</h2>
            {skuCode && (
              <p className="text-xs text-zinc-500 mt-0.5">
                Added to SKU {skuCode} and shared library
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {type === "Motif" && lockedMetalPurity && (
            <div className="rounded-lg bg-zinc-50 border border-zinc-200 px-3 py-2 text-xs text-zinc-600">
              Library motif will be saved as{" "}
              <span className="font-medium text-zinc-800">
                {motifMetal} {designPurity}
              </span>{" "}
              (matches this design).
            </div>
          )}
          {type === "Motif" && !lockedMetalPurity && (
            <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              Select metal and purity in Metal & pricing before creating a motif.
            </p>
          )}
          <div>
            <label className={labelClass}>Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Moon charm, CZ stone"
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Type</label>
            <select
              value={type}
              onChange={(e) =>
                setType(e.target.value as DesignElementType)
              }
              className={fieldClass}
            >
              <option value="Motif">Motif</option>
              <option value="Stone">Stone</option>
              <option value="Casting">Casting</option>
            </select>
          </div>
          {type === "Motif" ? (
            <>
              <div>
                <label className={labelClass}>Price (₹ per piece)</label>
                <input
                  type="number"
                  min={0}
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className={fieldClass}
                  placeholder="Optional"
                />
              </div>
              <div>
                <label className={labelClass}>Weight (grams per piece)</label>
                <input
                  type="number"
                  min={0}
                  step={0.01}
                  value={motifWeight}
                  onChange={(e) => setMotifWeight(e.target.value)}
                  className={fieldClass}
                  placeholder="Optional"
                />
              </div>
            </>
          ) : type === "Casting" ? (
            <div>
              <label className={labelClass}>Weight (grams per piece)</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className={fieldClass}
                placeholder="Optional"
              />
            </div>
          ) : (
            <div>
              <label className={labelClass}>Price (₹ per piece)</label>
              <input
                type="number"
                min={0}
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={fieldClass}
                placeholder="Optional"
              />
            </div>
          )}
          {type === "Motif" && (
            <MotifImageUpload imageUrl={imageUrl} onChange={setImageUrl} />
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
              disabled={submitting || (type === "Motif" && !lockedMetalPurity)}
              className="btn-primary flex-1 px-4 py-2.5 text-sm"
            >
              {submitting ? "Adding…" : "Add motif"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
