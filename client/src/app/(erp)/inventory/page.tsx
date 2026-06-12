"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useInventory } from "@/lib/inventory/inventory-context";
import { PRODUCT_CATEGORIES } from "@/lib/inventory/categories";
import type { InventoryItem } from "@/lib/types";
import { Plus, Search } from "lucide-react";

const InventoryTable = dynamic(
  () => import("@/app/(components)/inventory/InventoryTable"),
  {
    loading: () => (
      <div className="h-96 rounded-xl border border-zinc-200 bg-white animate-pulse" />
    ),
    ssr: false,
  },
);

const AddProductModal = dynamic(
  () => import("@/app/(components)/AddProductModal"),
  { ssr: false },
);

const ProductDetailPanel = dynamic(
  () => import("@/app/(components)/ProductDetailPanel"),
  { ssr: false },
);

export default function InventoryPage() {
  const { items, hydrated, addProduct } = useInventory();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(
    null,
  );
  const [successMessage, setSuccessMessage] = useState("");

  const categories = ["All", ...PRODUCT_CATEGORIES];

  const existingSkus = useMemo(() => items.map((i) => i.sku), [items]);
  const existingUnitCodes = useMemo(
    () => items.flatMap((i) => i.units.map((u) => u.itemCode)),
    [items],
  );

  const filtered = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.units.some((u) =>
          u.itemCode.toLowerCase().includes(search.toLowerCase()),
        );
      const matchesCategory =
        category === "All" || item.category === category;
      return matchesSearch && matchesCategory;
    });
  }, [items, search, category]);

  const handleAddProduct = (input: Parameters<typeof addProduct>[0]) => {
    const product = addProduct(input);
    setSuccessMessage(
      `Added ${product.name} — SKU ${product.sku} with ${product.stock} unit${product.stock > 1 ? "s" : ""}`,
    );
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  if (!hydrated) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        subtitle={`${filtered.length} SKUs · ${items.reduce((s, i) => s + i.stock, 0)} total units`}
        action={
          <button
            onClick={() => setModalOpen(true)}
            className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
          >
            <Plus size={16} />
            Add Product
          </button>
        }
      />

      {successMessage && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-700">
          {successMessage}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, or item code…"
            className="input-field w-full pl-9 pr-4 py-2 text-sm"
          />
        </div>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="input-field px-3 py-2 text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "All" ? "All Categories" : c}
            </option>
          ))}
        </select>
      </div>

      <div className="surface-card overflow-hidden w-full">
        <InventoryTable
          rows={filtered}
          onRowClick={setSelectedProduct}
        />
      </div>

      {modalOpen && (
        <AddProductModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          onSubmit={handleAddProduct}
          existingSkus={existingSkus}
          existingUnitCodes={existingUnitCodes}
        />
      )}

      {selectedProduct && (
        <ProductDetailPanel
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
