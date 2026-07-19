"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import { useInventory } from "@/lib/inventory/inventory-context";
import {
  matchesProductMetalTab,
  type ProductMetalTab,
} from "@/lib/inventory/metal-stats";
import {
  createProductCollection,
  fetchProductCollections,
} from "@/lib/api/product-collections";
import { getApiErrorMessage } from "@/lib/api/client";
import type { InventoryItem } from "@/lib/types";

const ProductTable = dynamic(
  () => import("@/app/(components)/products/ProductTable"),
  {
    loading: () => (
      <div className="h-96 rounded-xl border border-zinc-200 bg-white animate-pulse" />
    ),
    ssr: false,
  },
);

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

function sortProducts(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => a.sku.localeCompare(b.sku));
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { items, hydrated, loading, error } = useInventory();
  const canWrite = user ? canWriteInventory(user.role) : false;
  const [search, setSearch] = useState("");
  const [metalTab, setMetalTab] = useState<ProductMetalTab>("all");
  const [showCollectionForm, setShowCollectionForm] = useState(false);
  const [collectionName, setCollectionName] = useState("");
  const [collectionError, setCollectionError] = useState("");
  const [collectionSubmitting, setCollectionSubmitting] = useState(false);

  const loadCollections = useCallback(async () => {
    try {
      await fetchProductCollections();
    } catch {
      // Collections list is managed on this page; edit form loads its own copy.
    }
  }, []);

  useEffect(() => {
    void loadCollections();
  }, [loadCollections]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sortProducts(
      items.filter((product) => {
        const matchesSearch =
          !needle ||
          product.name.toLowerCase().includes(needle) ||
          product.sku.toLowerCase().includes(needle) ||
          product.category.toLowerCase().includes(needle) ||
          product.productCollectionName?.toLowerCase().includes(needle);
        const matchesMetal = matchesProductMetalTab(product.metal, metalTab);
        return matchesSearch && matchesMetal;
      }),
    );
  }, [items, search, metalTab]);

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    setCollectionSubmitting(true);
    setCollectionError("");
    try {
      await createProductCollection({ name: collectionName.trim() });
      setCollectionName("");
      setShowCollectionForm(false);
    } catch (err) {
      setCollectionError(getApiErrorMessage(err, "Failed to create collection."));
    } finally {
      setCollectionSubmitting(false);
    }
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Product"
        subtitle={`${filtered.length} SKUs — shared catalog config for all units`}
        action={
          canWrite ? (
            <button
              type="button"
              onClick={() => setShowCollectionForm((v) => !v)}
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              Add Collection
            </button>
          ) : undefined
        }
      />

      {(error || collectionError) && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error || collectionError}
        </div>
      )}

      {showCollectionForm && canWrite && (
        <form onSubmit={handleCreateCollection} className="form-section mb-6 max-w-md">
          <div>
            <label className={labelClass}>Collection name</label>
            <input
              className={fieldClass}
              value={collectionName}
              onChange={(e) => setCollectionName(e.target.value)}
              placeholder="e.g. Bridal, Classic"
              required
              autoFocus
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary px-4 py-2 text-sm"
              onClick={() => setShowCollectionForm(false)}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={collectionSubmitting}
              className="btn-primary px-4 py-2 text-sm"
            >
              {collectionSubmitting ? "Saving…" : "Save collection"}
            </button>
          </div>
        </form>
      )}

      <div className="filter-bar">
        {(
          [
            ["all", "All"],
            ["gold", "Gold"],
            ["silver", "Silver"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setMetalTab(key)}
            className={`tab-btn ${metalTab === key ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            {label}
          </button>
        ))}
        <div className="filter-search">
          <Search size={14} className="text-zinc-400 shrink-0" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name, SKU, category, or collection…"
          />
        </div>
        <span className="filter-count">
          Showing {filtered.length} of {items.length}
        </span>
      </div>

      <div className="data-table-wrap w-full">
        <ProductTable products={filtered} canWrite={canWrite} />
      </div>
    </div>
  );
}
