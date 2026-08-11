"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LogOut } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import ImageUpload from "@/app/(components)/ImageUpload";
import StockExcelImport from "@/app/(components)/inventory/StockExcelImport";
import { useAuth } from "@/lib/auth/auth-context";
import { canViewCostPrice, canWriteInventory } from "@/lib/auth/permissions";
import { useInventory } from "@/lib/inventory/inventory-context";
import {
  HSN_OPTIONS,
  STOCK_FORM_METALS,
  STOCK_FORM_PURITIES,
  STOCK_SUB_CATEGORIES,
  stockCategories,
} from "@/lib/inventory/stock-import";
import {
  CATEGORY_SIZES,
  categoryHasSizeOptions,
} from "@/lib/inventory/category-sizes";
import type { ProductCategory } from "@/lib/inventory/categories";
import { generateSku, generateUnitCodes } from "@/lib/inventory/sku";
import type { PendingImage } from "@/lib/inventory/images";
import { fetchCurrentMarketRates } from "@/lib/api/market-rates";
import { importLegacyStock } from "@/lib/api/inventory";
import {
  createProductCollection,
  fetchProductCollections,
} from "@/lib/api/product-collections";
import { createVendor, fetchVendors } from "@/lib/api/vendors";
import { createStoneType, fetchStoneTypes } from "@/lib/api/stone-types";
import { getApiErrorMessage } from "@/lib/api/client";
import type {
  MarketRatesCurrent,
  MetalType,
  ProductCollection,
  Purity,
  StoneType,
  Vendor,
} from "@/lib/types";
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
  const canSeeCostPrice = user ? canViewCostPrice(user.role) : false;

  const [metal, setMetal] = useState<MetalType>("Silver");
  const [autoGenerateSku, setAutoGenerateSku] = useState(true);
  const [catalogNo, setCatalogNo] = useState("");
  const [description, setDescription] = useState("");
  const [stoneTypeIds, setStoneTypeIds] = useState<string[]>([]);
  const [stoneInfo, setStoneInfo] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [showVendorForm, setShowVendorForm] = useState(false);
  const [newVendorName, setNewVendorName] = useState("");
  const [vendorSubmitting, setVendorSubmitting] = useState(false);
  const [stoneTypes, setStoneTypes] = useState<StoneType[]>([]);
  const [showStoneTypeForm, setShowStoneTypeForm] = useState(false);
  const [newStoneTypeName, setNewStoneTypeName] = useState("");
  const [stoneTypeSubmitting, setStoneTypeSubmitting] = useState(false);
  const [category, setCategory] = useState<ProductCategory>("Others");
  const [subCategory, setSubCategory] = useState("");
  const [categorySize, setCategorySize] = useState("");
  const [collectionId, setCollectionId] = useState("");
  const [collections, setCollections] = useState<ProductCollection[]>([]);
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState("");
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);
  const [weightGrams, setWeightGrams] = useState("");
  const [hsn, setHsn] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [purity, setPurity] = useState<Purity>("925");
  const [makingCharges, setMakingCharges] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
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

  useEffect(() => {
    fetchProductCollections()
      .then(setCollections)
      .catch(() => setCollections([]));
  }, []);

  useEffect(() => {
    fetchVendors()
      .then(setVendors)
      .catch(() => setVendors([]));
  }, []);

  useEffect(() => {
    fetchStoneTypes()
      .then(setStoneTypes)
      .catch(() => setStoneTypes([]));
  }, []);

  const categorySizeOptions = CATEGORY_SIZES[category] ?? [];
  const showCategorySize = categoryHasSizeOptions(category);

  useEffect(() => {
    if (!showCategorySize) {
      setCategorySize("");
      return;
    }
    if (categorySize && !categorySizeOptions.includes(categorySize)) {
      setCategorySize("");
    }
  }, [category, categorySize, categorySizeOptions, showCategorySize]);

  const selectedStoneTypes = useMemo(
    () => stoneTypes.filter((type) => stoneTypeIds.includes(type.id)),
    [stoneTypes, stoneTypeIds],
  );

  const handleAddCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newCollectionName.trim();
    if (!trimmed) return;

    setCollectionSubmitting(true);
    setError("");
    try {
      const created = await createProductCollection({ name: trimmed });
      setCollections((prev) =>
        [...prev.filter((item) => item.id !== created.id), created].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setCollectionId(created.id);
      setNewCollectionName("");
      setShowCollectionForm(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add collection."));
    } finally {
      setCollectionSubmitting(false);
    }
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newVendorName.trim();
    if (!trimmed) return;

    setVendorSubmitting(true);
    setError("");
    try {
      const created = await createVendor({ name: trimmed });
      setVendors((prev) =>
        [...prev.filter((item) => item.id !== created.id), created].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setVendorId(created.id);
      setNewVendorName("");
      setShowVendorForm(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add vendor."));
    } finally {
      setVendorSubmitting(false);
    }
  };

  const handleAddStoneType = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newStoneTypeName.trim();
    if (!trimmed) return;

    setStoneTypeSubmitting(true);
    setError("");
    try {
      const created = await createStoneType({ name: trimmed });
      setStoneTypes((prev) =>
        [...prev.filter((item) => item.id !== created.id), created].sort((a, b) =>
          a.name.localeCompare(b.name),
        ),
      );
      setStoneTypeIds((prev) =>
        prev.includes(created.id) ? prev : [...prev, created.id],
      );
      setNewStoneTypeName("");
      setShowStoneTypeForm(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add stone type."));
    } finally {
      setStoneTypeSubmitting(false);
    }
  };

  const toggleStoneType = (id: string) => {
    setStoneTypeIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const existingSkus = useMemo(() => items.map((i) => i.sku), [items]);
  const existingUnitCodes = useMemo(
    () => items.flatMap((i) => i.units.map((u) => u.itemCode)),
    [items],
  );

  const previewSku = useMemo(() => {
    if (!autoGenerateSku && catalogNo.trim()) {
      return catalogNo.trim().toUpperCase();
    }
    return generateSku(existingSkus, category, metal);
  }, [autoGenerateSku, catalogNo, existingSkus, category, metal]);

  const previewUnitCodes = useMemo(() => {
    const qty = Math.max(1, parseInt(quantity, 10) || 1);
    return generateUnitCodes(previewSku, qty, existingUnitCodes);
  }, [previewSku, quantity, existingUnitCodes]);

  const livePrice = useMemo(() => {
    const weight = parseFloat(weightGrams);
    if (!weight) return null;
    return computeLivePrice(weight, metal, purity, rates);
  }, [weightGrams, metal, purity, rates]);

  const marginPreview = useMemo(() => {
    if (!canSeeCostPrice) return null;
    const retail = parseFloat(price || String(livePrice ?? ""));
    const cost = parseFloat(costPrice);
    if (!retail || !cost || cost <= 0) return null;
    return Math.round((retail - cost) * 100) / 100;
  }, [canSeeCostPrice, price, costPrice, livePrice]);

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

    const manualSku = catalogNo.trim().toUpperCase();
    if (!autoGenerateSku) {
      if (!manualSku) {
        setError("Enter a SKU or switch to auto-generate.");
        return;
      }
      if (existingSkus.includes(manualSku)) {
        setError(`SKU ${manualSku} already exists. Choose a different code.`);
        return;
      }
    }

    const fullName = [
      description.trim(),
      selectedStoneTypes.length
        ? `[${selectedStoneTypes.map((type) => type.name).join(", ")}]`
        : "",
      stoneInfo.trim() ? `— ${stoneInfo.trim()}` : "",
      subCategory ? `(${subCategory})` : "",
      categorySize ? `Size ${categorySize}` : "",
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
        catalogNo: !autoGenerateSku && manualSku ? manualSku : undefined,
        subCategory: subCategory || undefined,
        categorySize: categorySize || undefined,
        stoneInfo: stoneInfo.trim() || undefined,
        hsnCode: hsn || undefined,
        productCollectionId: collectionId || undefined,
        vendorId: vendorId || undefined,
        stoneTypeIds: stoneTypeIds.length ? stoneTypeIds : undefined,
        costPrice: canSeeCostPrice && costPrice ? parseFloat(costPrice) : undefined,
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
    <div className="page-content space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Bulk Silver/BM Stock Add to Main Stock"
          subtitle="Add finished goods manually or import from the same Excel sheet used in Central Stock"
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
        <form onSubmit={handleSubmit} className="surface-card p-5 space-y-5">
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
              <label className={labelClass}>SKU</label>
              <div className="space-y-2">
                <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
                  <input
                    type="checkbox"
                    checked={autoGenerateSku}
                    onChange={(e) => {
                      setAutoGenerateSku(e.target.checked);
                      if (e.target.checked) setCatalogNo("");
                    }}
                    className="rounded border-zinc-300"
                  />
                  Auto-generate SKU
                </label>
                {autoGenerateSku ? (
                  <p className="text-[11px] font-mono text-zinc-500 bg-zinc-50 rounded-lg px-3 py-2">
                    {previewSku}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={catalogNo}
                    onChange={(e) => setCatalogNo(e.target.value.toUpperCase())}
                    placeholder="Enter SKU manually"
                    className={fieldClass}
                  />
                )}
              </div>
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
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className={labelClass}>Stones (multiple)</label>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => setShowStoneTypeForm((prev) => !prev)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {showStoneTypeForm ? "Cancel" : "+ Add stone type"}
                  </button>
                )}
              </div>
              {showStoneTypeForm && canAdd && (
                <form onSubmit={handleAddStoneType} className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={newStoneTypeName}
                    onChange={(e) => setNewStoneTypeName(e.target.value)}
                    placeholder="New stone type name"
                    className={fieldClass}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={stoneTypeSubmitting || !newStoneTypeName.trim()}
                    className="btn-primary px-3 py-2 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {stoneTypeSubmitting ? "Saving…" : "Save"}
                  </button>
                </form>
              )}
              {selectedStoneTypes.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1.5">
                  {selectedStoneTypes.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => toggleStoneType(type.id)}
                      className="text-xs px-2 py-1 rounded-full bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                    >
                      {type.name} ×
                    </button>
                  ))}
                </div>
              )}
              <select
                value=""
                onChange={(e) => {
                  const id = e.target.value;
                  if (id) toggleStoneType(id);
                }}
                className={fieldClass}
              >
                <option value="">Add stone type…</option>
                {stoneTypes
                  .filter((type) => !stoneTypeIds.includes(type.id))
                  .map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
              </select>
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
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className={labelClass}>Vendor</label>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => setShowVendorForm((prev) => !prev)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {showVendorForm ? "Cancel" : "+ Add vendor"}
                  </button>
                )}
              </div>
              {showVendorForm && canAdd && (
                <form onSubmit={handleAddVendor} className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    placeholder="New vendor name"
                    className={fieldClass}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={vendorSubmitting || !newVendorName.trim()}
                    className="btn-primary px-3 py-2 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {vendorSubmitting ? "Saving…" : "Save"}
                  </button>
                </form>
              )}
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Choose …</option>
                {vendors.map((vendor) => (
                  <option key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </option>
                ))}
              </select>
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
            {showCategorySize && (
              <div>
                <label className={labelClass}>Category Size</label>
                <select
                  value={categorySize}
                  onChange={(e) => setCategorySize(e.target.value)}
                  className={fieldClass}
                >
                  <option value="">Choose …</option>
                  {categorySizeOptions.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label className={labelClass}>Collection</label>
                {canAdd && (
                  <button
                    type="button"
                    onClick={() => setShowCollectionForm((prev) => !prev)}
                    className="text-xs text-blue-600 hover:underline"
                  >
                    {showCollectionForm ? "Cancel" : "+ Add collection"}
                  </button>
                )}
              </div>
              {showCollectionForm && canAdd && (
                <form onSubmit={handleAddCollection} className="mb-2 flex gap-2">
                  <input
                    type="text"
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="New collection name"
                    className={fieldClass}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={collectionSubmitting || !newCollectionName.trim()}
                    className="btn-primary px-3 py-2 text-sm whitespace-nowrap disabled:opacity-50"
                  >
                    {collectionSubmitting ? "Saving…" : "Save"}
                  </button>
                </form>
              )}
              <select
                value={collectionId}
                onChange={(e) => setCollectionId(e.target.value)}
                className={fieldClass}
              >
                <option value="">Choose …</option>
                {collections.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelClass}>Net Weight (g)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={weightGrams}
                onChange={(e) => setWeightGrams(e.target.value)}
                placeholder="Net weight"
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

          <div
            className={`grid grid-cols-1 md:grid-cols-2 gap-4 ${
              canSeeCostPrice ? "xl:grid-cols-5" : "xl:grid-cols-4"
            }`}
          >
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

            {canSeeCostPrice && (
              <div>
                <label className={labelClass}>Cost Price (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={costPrice}
                  onChange={(e) => setCostPrice(e.target.value)}
                  placeholder="Optional"
                  className={fieldClass}
                />
              </div>
            )}

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

            {marginPreview != null && (
              <div className="flex items-end">
                <p className="text-xs text-zinc-500 pb-2">
                  Margin:{" "}
                  <span className="font-medium text-zinc-700">
                    {formatCurrency(marginPreview)}
                  </span>
                </p>
              </div>
            )}
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
