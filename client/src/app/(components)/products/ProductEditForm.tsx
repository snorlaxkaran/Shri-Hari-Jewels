"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { InventoryItem, MetalType, Purity, UpdateProductInput } from "@/lib/types";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/inventory/categories";
import type { PendingImage } from "@/lib/inventory/images";
import ImageUpload from "@/app/(components)/ImageUpload";
import { getApiErrorMessage } from "@/lib/api/client";

const METALS: MetalType[] = ["Gold", "Silver", "Platinum", "Rose Gold"];
const PURITIES: Purity[] = ["24K", "22K", "18K", "14K", "925"];
const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type ProductEditFormProps = {
  product: InventoryItem;
  cancelHref: string;
  onCancelClick?: () => void;
  onSubmit: (input: UpdateProductInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

export default function ProductEditForm({
  product,
  cancelHref,
  onCancelClick,
  onSubmit,
  onDirtyChange,
}: ProductEditFormProps) {
  const [category, setCategory] = useState<ProductCategory>("Earrings");
  const [name, setName] = useState("");
  const [metal, setMetal] = useState<MetalType>("Gold");
  const [purity, setPurity] = useState<Purity>("22K");
  const [weightGrams, setWeightGrams] = useState("");
  const [makingCharges, setMakingCharges] = useState("");
  const [stoneCarat, setStoneCarat] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setCategory(product.category as ProductCategory);
    setName(product.name);
    setMetal(product.metal);
    setPurity(product.purity);
    setWeightGrams(String(product.weightGrams));
    setMakingCharges(String(product.makingCharges));
    setStoneCarat(product.stoneCarat ? String(product.stoneCarat) : "");
    setPrice(String(product.price));
    setImages(product.images.map((img) => ({ ...img })));
    setError("");
    setDirty(false);
  }, [product]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const markDirty = () => setDirty(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const weight = parseFloat(weightGrams);
    const charges = parseFloat(makingCharges);
    const unitPrice = parseFloat(price);

    if (!name.trim()) {
      setError("Product name is required.");
      return;
    }
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

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        metal,
        purity,
        weightGrams: weight,
        makingCharges: charges,
        stoneCarat: stoneCarat ? parseFloat(stoneCarat) : null,
        price: unitPrice,
        images: images.map(({ id, url, name: imgName }) => ({
          id,
          url,
          name: imgName,
        })),
      });
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
        <p className="text-xs font-mono text-zinc-400">{product.sku}</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className={labelClass}>Product Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                markDirty();
              }}
              className={fieldClass}
              autoFocus
            />
          </div>
          <div>
            <label className={labelClass}>Category *</label>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value as ProductCategory);
                markDirty();
              }}
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
            <label className={labelClass}>Metal</label>
            <select
              value={metal}
              onChange={(e) => {
                setMetal(e.target.value as MetalType);
                markDirty();
              }}
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
            <label className={labelClass}>Purity</label>
            <select
              value={purity}
              onChange={(e) => {
                setPurity(e.target.value as Purity);
                markDirty();
              }}
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
            <label className={labelClass}>Weight (grams) *</label>
            <input
              type="number"
              step="0.01"
              value={weightGrams}
              onChange={(e) => {
                setWeightGrams(e.target.value);
                markDirty();
              }}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Making Charges (₹) *</label>
            <input
              type="number"
              value={makingCharges}
              onChange={(e) => {
                setMakingCharges(e.target.value);
                markDirty();
              }}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Stone Carat</label>
            <input
              type="number"
              step="0.01"
              value={stoneCarat}
              onChange={(e) => {
                setStoneCarat(e.target.value);
                markDirty();
              }}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Price per Unit (₹) *</label>
            <input
              type="number"
              value={price}
              onChange={(e) => {
                setPrice(e.target.value);
                markDirty();
              }}
              className={fieldClass}
            />
          </div>
        </div>

        <ImageUpload
          images={images}
          onChange={(next) => {
            setImages(next);
            markDirty();
          }}
        />
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
        <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
