"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut, RefreshCw } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import ImageUpload from "@/app/(components)/ImageUpload";
import StockExcelImport from "@/app/(components)/inventory/StockExcelImport";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import { useInventory } from "@/lib/inventory/inventory-context";
import {
  HSN_OPTIONS,
  STOCK_COLLECTIONS,
  STOCK_FORM_METALS,
  STOCK_FORM_PURITIES,
  STOCK_SUB_CATEGORIES,
  stockCategories,
} from "@/lib/inventory/stock-import";
import type { ProductCategory } from "@/lib/inventory/categories";
import { generateSku, generateUnitCodes } from "@/lib/inventory/sku";
import type { PendingImage } from "@/lib/inventory/images";
import { fetchCurrentMarketRates } from "@/lib/api/market-rates";
import { importLegacyStock } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import type { MarketRatesCurrent, MetalType, Purity } from "@/lib/types";
import { formatCurrency } from "@/lib/format";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium uppercase tracking-wide";

const computeLivePrice = (
  weightGrams: number,
  metal: MetalType,
  purity: Purity,
  rates: MarketRatesCurrent | null,
): number | null => {
  if (!rates || !weightGrams) return null;
  let rate: number | null = null;
  const goldMetals = new Set<MetalType>(["Gold", "Rose Gold", "Platinum"]);
  if (goldMetals.has(metal) && purity === "22K") rate = rates.gold22k;
  if (goldMetals.has(metal) && purity === "18K" && rates.gold22k) {
    rate = Math.round(rates.gold22k * (18 / 22) * 100) / 100;
  }
  if (metal === "Silver" && purity === "925") rate = rates.silver925;
  if (rate == null) return null;

  const makingPct =
    metal === "Silver" ? rates.silverMakingChargesPct : rates.goldMakingChargesPct;
  const metalValue = Math.round(weightGrams * rate * 100) / 100;
  const making = Math.round(metalValue * (makingPct / 100) * 100) / 100;
  return metalValue + making;
};

export default function NewStockPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, addProduct, refresh } = useInventory();
  const canAdd = user ? canWriteInventory(user.role) : false;

  const [metal, setMetal] = useState<MetalType>("Silver");
  const [catalogNo, setCatalogNo] = useState("");
  const [description, setDescription] = useState("");
  const [stones, setStones] = useState("");
  const [stoneInfo, setStoneInfo] = useState("");
  const [supplier, setSupplier] = useState("");
  const [category, setCategory] = useState<ProductCategory>("Others");
  const [subCategory, setSubCategory] = useState("");
  const [categorySize, setCategorySize] = useState("");
  const [collection, setCollection] = useState("");
  const [weightGrams, setWeightGrams] = useState("");
  const [hsn, setHsn] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purity, setPurity] = useState<Purity>("925");
  const [makingCharges, setMakingCharges] = useState("");
  const [price, setPrice] = useState("");
  const [images, setImages] = useState<PendingImage[]>([]);
  const [rates, setRates] = useState<MarketRatesCurrent | null>(null);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"manual" | "excel">("manual");

  useEffect(() => {
    if (user && !canAdd) router.replace("/inventory");
  }, [user, canAdd, router]);

  useEffect(() => {
    fetchCurrentMarketRates()
      .then(setRates)
      .catch(() => setRates(null));
  }, []);

  const existingSkus = useMemo(() => items.map((i) => i.sku), [items]);
  const existingUnitCodes = useMemo(
    () => items.flatMap((i) => i.units.map((u) => u.itemCode)),
    [items],
  );

  const previewSku = useMemo(() => {
    if (catalogNo.trim()) return catalogNo.trim().toUpperCase();
    return generateSku(existingSkus, category);
  }, [catalogNo, existingSkus, category]);

  const previewUnitCodes = useMemo(() => {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    return generateUnitCodes(previewSku, qty, existingUnitCodes);
  }, [previewSku, quantity, existingUnitCodes]);

  const livePrice = useMemo(() => {
    const weight = parseFloat(weightGrams);
    if (!weight) return null;
    return computeLivePrice(weight, metal, purity, rates);
  }, [weightGrams, metal, purity, rates]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!description.trim()) {
      setError("Description is required.");
      return;
    }

    const weight = parseFloat(weightGrams);
    const charges = makingCharges ? parseFloat(makingCharges) : 0;
    const unitPrice = parseFloat(price || String(livePrice ?? ""));
    const qty = parseInt(quantity, 10);

    if (!weight || weight <= 0) {
      setError("Enter a valid weight.");
      return;
    }
    if (isNaN(charges) || charges < 0) {
      setError("Enter valid making charges.");
      return;
    }
    if (!unitPrice || unitPrice <= 0) {
      setError("Enter a valid price or ensure live rates are available.");
      return;
    }
    if (!qty || qty < 1 || qty > 999) {
      setError("Quantity must be between 1 and 999.");
      return;
    }

    const fullName = [
      description.trim(),
      stones.trim() ? `[${stones.trim()}]` : "",
      stoneInfo.trim() ? `— ${stoneInfo.trim()}` : "",
      subCategory ? `(${subCategory})` : "",
      collection ? `{${collection}}` : "",
    ]
      .filter(Boolean)
      .join(" ");

    setSubmitting(true);
    try {
      await addProduct({
        name: fullName,
        category,
        metal,
        purity,
        weightGrams: weight,
        makingCharges: charges,
        price: unitPrice,
        quantity: qty,
        images: images.map(({ id, url, name }) => ({ id, url, name })),
        catalogNo: catalogNo.trim() || undefined,
      });
      await refresh({ silent: true });
      router.push("/inventory");
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (user && !canAdd) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Bulk Silver/BM Stock Add to Main Stock"
          subtitle="Add finished goods manually or import your legacy Excel stock sheet"
        />
        <Link
          href="/inventory"
          className="btn-secondary inline-flex items-center gap-2 px-4 py-2 text-sm self-start"
        >
          <LogOut size={16} />
          Cancel
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["manual", "Manual entry"],
            ["excel", "Import from Excel"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`tab-btn ${activeTab === key ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "excel" ? (
        <StockExcelImport
          disabled={!canAdd}
          onImport={importLegacyStock}
          onComplete={() => void refresh({ silent: true })}
        />
      ) : (
        <form onSubmit={handleSubmit} className="surface-card rounded-xl p-5 space-y-5">
          {error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          {livePrice != null && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Live list price (Gold/Silver):{" "}
              <strong>{formatCurrency(livePrice)}</strong>
              {rates?.isStale && " — rates may be stale; refresh from the banner above."}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div>
              <label className={labelClass}>Metal</label>
              <select
                value={metal}
                onChange={(e) => setMetal(e.target.value as MetalType)}
                className={fieldClass}
              >
                {STOCK_FORM_METALS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Catalog No.</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={catalogNo}
                  onChange={(e) => setCatalogNo(e.target.value)}
                  placeholder="Catalog Number"
                  className={fieldClass}
                />
                <button
                  type="button"
                  onClick={() => setCatalogNo("")}
                  className="btn-secondary px-3 shrink-0"
                  title="Use auto SKU"
                >
                  <RefreshCw size={16} />
                </button>
              </div>
              <p className="text-[11px] text-zinc-400 mt-1 font-mono">{previewSku}</p>
            </div>

            <div className="xl:col-span-2">
              <label className={labelClass}>Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Description"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Stones (multiple)</label>
              <input
                type="text"
                value={stones}
                onChange={(e) => setStones(e.target.value)}
                placeholder="Pearl, Glass…"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div className="xl:col-span-2">
              <label className={labelClass}>Diamond/Stone Information</label>
              <input
                type="text"
                value={stoneInfo}
                onChange={(e) => setStoneInfo(e.target.value)}
                placeholder="Diamond/Stone Information"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Supplier</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                placeholder="Vendor name"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className={fieldClass}
              >
                {stockCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Sub Category</label>
              <select
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
                className={fieldClass}
              >
                <option value="">Choose …</option>
                {STOCK_SUB_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <div>
              <label className={labelClass}>Category Size</label>
              <input
                type="text"
                value={categorySize}
                onChange={(e) => setCategorySize(e.target.value)}
                placeholder="Size"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Collection</label>
              <select
                value={collection}
                onChange={(e) => setCollection(e.target.value)}
                className={fieldClass}
              >
                <option value="">Choose …</option>
                {STOCK_COLLECTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Weight</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                placeholder="Weight"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>HSN</label>
              <select
                value={hsn}
                onChange={(e) => setHsn(e.target.value)}
                className={fieldClass}
              >
                {HSN_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value}>
                    {opt.value ? opt.label : "Choose …"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Quantity</label>
              <input
                type="number"
                min={1}
                max={999}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Quantity"
                className={fieldClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <div>
              <label className={labelClass}>Purity</label>
              <select
                value={purity}
                onChange={(e) => setPurity(e.target.value as Purity)}
                className={fieldClass}
              >
                {STOCK_FORM_PURITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Making Charges (₹)</label>
              <input
                type="number"
                min="0"
                value={makingCharges}
                onChange={(e) => setMakingCharges(e.target.value)}
                placeholder="Optional"
                className={fieldClass}
              />
            </div>

            <div>
              <label className={labelClass}>Retail / List Price (₹)</label>
              <input
                type="number"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={livePrice ? String(Math.round(livePrice)) : "Price"}
                className={fieldClass}
              />
            </div>
          </div>

          <div>
            <label className={labelClass}>Image</label>
            <ImageUpload images={images} onChange={setImages} />
          </div>

          {previewUnitCodes.length > 0 && (
            <div>
              <p className={`${labelClass} mb-2`}>
                Item codes ({previewUnitCodes.length})
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

          <div className="flex gap-3 pt-2">
            <Link href="/inventory" className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 px-4 py-2.5 text-sm disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Add to Main Stock"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
