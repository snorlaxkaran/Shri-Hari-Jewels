"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import type { MetalType, NewProductInput, Purity } from "@/lib/types";
import {
  CATEGORY_SKU_PREFIX,
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/lib/inventory/categories";
import { generateSku, generateUnitCodes } from "@/lib/inventory/sku";
import type { PendingImage } from "@/lib/inventory/images";
import ImageUpload from "@/app/(components)/ImageUpload";
import { getApiErrorMessage } from "@/lib/api/client";

type AddProductModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewProductInput) => Promise<void>;
  existingSkus: string[];
  existingUnitCodes: string[];
};

const METALS: MetalType[] = ["Gold", "Silver", "Platinum", "Rose Gold"];
const PURITIES: Purity[] = ["24K", "22K", "18K", "14K", "925"];

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function AddProductModal({
  open,
  onClose,
  onSubmit,
  existingSkus,
  existingUnitCodes,
}: AddProductModalProps) {
  const [category, setCategory] = useState<ProductCategory>("Earrings");
  const [name, setName] = useState("");
  const [metal, setMetal] = useState<MetalType>("Gold");
  const [purity, setPurity] = useState<Purity>("22K");
  const [weightGrams, setWeightGrams] = useState("");
  const [makingCharges, setMakingCharges] = useState("");
  const [stoneCarat, setStoneCarat] = useState("");
  const [price, setPrice] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const previewSku = useMemo(
    () => generateSku(existingSkus, category, metal),
    [existingSkus, category, metal],
  );

  const previewUnitCodes = useMemo(() => {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    return generateUnitCodes(previewSku, qty, existingUnitCodes);
  }, [previewSku, quantity, existingUnitCodes]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  const reset = () => {
    setCategory("Earrings");
    setName("");
    setMetal("Gold");
    setPurity("22K");
    setWeightGrams("");
    setMakingCharges("");
    setStoneCarat("");
    setPrice("");
    setQuantity("1");
    setImages([]);
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

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }

    const weight = parseFloat(weightGrams);
    const charges = parseFloat(makingCharges);
    const unitPrice = parseFloat(price);
    const qty = parseInt(quantity, 10);

    if (!weight || weight <= 0) {
      setError("Enter a valid weight in grams.");
      return;
    }
    if (isNaN(charges) || charges < 0) {
      setError("Enter valid making charges.");
      return;
    }
    if (!unitPrice || unitPrice <= 0) {
      setError("Enter a valid price.");
      return;
    }
    if (!qty || qty < 1 || qty > 999) {
      setError("Quantity must be between 1 and 999.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        metal,
        purity,
        weightGrams: weight,
        makingCharges: charges,
        stoneCarat: stoneCarat ? parseFloat(stoneCarat) : undefined,
        price: unitPrice,
        quantity: qty,
        images: images.map(({ id, url, name }) => ({ id, url, name })),
      });
      reset();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
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
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-2xl"
        role="dialog"
        aria-modal
        aria-labelledby="add-product-title"
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 z-10 bg-white">
          <h2 id="add-product-title" className="text-base font-semibold text-zinc-900">
            Add New Product
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* SKU preview */}
          <div className="rounded-lg p-4 border border-zinc-200 bg-zinc-50">
            <p className="text-[11px] uppercase tracking-wide mb-1 text-zinc-400 font-medium">
              Auto-generated SKU
            </p>
            <p className="text-lg font-mono font-semibold text-zinc-900">
              {previewSku}
            </p>
            <p className="text-xs mt-1 text-zinc-400">
              Format:{" "}
              <span className="font-mono">
                {CATEGORY_SKU_PREFIX[category]}-26-0001
              </span>{" "}
              — category prefix, current year, sequence
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>
                Product Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Pearl Drop Earrings"
                className={fieldClass}
                autoFocus
              />
            </div>

            <div>
              <label className={labelClass}>
                Category *
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className={fieldClass}
              >
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Quantity *
              </label>
              <input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={fieldClass}
              />
              <p className="text-[11px] mt-1 text-zinc-400">
                Units added under this SKU
              </p>
            </div>

            <div>
              <label className={labelClass}>
                Metal
              </label>
              <select
                value={metal}
                onChange={(e) => setMetal(e.target.value as MetalType)}
                className={fieldClass}
              >
                {METALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Purity
              </label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value as Purity)}
                className={fieldClass}
              >
                {PURITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>
                Weight (grams) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                placeholder="9.8"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Making Charges (₹) *
              </label>
              <input
                type="number"
                min="0"
                value={makingCharges}
                onChange={(e) => setMakingCharges(e.target.value)}
                placeholder="3800"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Stone Carat
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={stoneCarat}
                onChange={(e) => setStoneCarat(e.target.value)}
                placeholder="Optional"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>
                Price per Unit (₹) *
              </label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="72000"
                className={fieldClass}
              />
            </div>
          </div>

          <ImageUpload images={images} onChange={setImages} />

          {/* Unit codes preview */}
          {previewUnitCodes.length > 0 && (
            <div>
              <p className={`${labelClass} mb-2`}>
                Item codes ({previewUnitCodes.length} unit
                {previewUnitCodes.length > 1 ? "s" : ""})
              </p>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 rounded-lg border border-zinc-200 bg-zinc-50">
                {previewUnitCodes.map((code) => (
                  <span
                    key={code}
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-200 text-zinc-700"
                  >
                    {code}
                  </span>
                ))}
              </div>
            </div>
          )}

          {error && (
            <p className="text-xs text-red-500">
              {error}
            </p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="btn-secondary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Add Product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
