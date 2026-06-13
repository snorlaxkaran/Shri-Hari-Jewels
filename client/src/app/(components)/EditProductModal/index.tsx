"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { InventoryItem, MetalType, Purity, UpdateProductInput } from "@/lib/types";
import { PRODUCT_CATEGORIES, type ProductCategory } from "@/lib/inventory/categories";
import type { PendingImage } from "@/lib/inventory/images";
import ImageUpload from "@/app/(components)/ImageUpload";
import { getApiErrorMessage } from "@/lib/api/client";

type EditProductModalProps = {
  open: boolean;
  product: InventoryItem;
  onClose: () => void;
  onSubmit: (input: UpdateProductInput) => Promise<void>;
};

const METALS: MetalType[] = ["Gold", "Silver", "Platinum", "Rose Gold"];
const PURITIES: Purity[] = ["24K", "22K", "18K", "14K", "925"];
const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function EditProductModal({
  open,
  product,
  onClose,
  onSubmit,
}: EditProductModalProps) {
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

  useEffect(() => {
    if (!open) return;
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
  }, [open, product]);

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
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white">
          <div>
            <p className="text-xs font-mono text-zinc-400">{product.sku}</p>
            <h2 className="text-base font-semibold text-zinc-900">Edit Product</h2>
          </div>
          <button onClick={onClose} disabled={submitting} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Product Name *</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Category *</label>
              <select value={category} onChange={(e) => setCategory(e.target.value as ProductCategory)} className={fieldClass}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Metal</label>
              <select value={metal} onChange={(e) => setMetal(e.target.value as MetalType)} className={fieldClass}>
                {METALS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Purity</label>
              <select value={purity} onChange={(e) => setPurity(e.target.value as Purity)} className={fieldClass}>
                {PURITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Weight (grams) *</label>
              <input type="number" step="0.01" value={weightGrams} onChange={(e) => setWeightGrams(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Making Charges (₹) *</label>
              <input type="number" value={makingCharges} onChange={(e) => setMakingCharges(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Stone Carat</label>
              <input type="number" step="0.01" value={stoneCarat} onChange={(e) => setStoneCarat(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Price per Unit (₹) *</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} className={fieldClass} />
            </div>
          </div>

          <ImageUpload images={images} onChange={setImages} />

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="btn-secondary flex-1 px-4 py-2.5 text-sm">
              Cancel
            </button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
