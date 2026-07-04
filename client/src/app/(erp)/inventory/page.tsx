"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatCard from "@/app/(components)/StatCard";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import { fetchBranches } from "@/lib/api/branches";
import { useInventory } from "@/lib/inventory/inventory-context";
import { PRODUCT_CATEGORIES } from "@/lib/inventory/categories";
import {
  getProductMetalStats,
  matchesProductMetalTab,
  type ProductMetalTab,
} from "@/lib/inventory/metal-stats";
import {
  sortInventoryItems,
  toggleSort,
  type InventorySortField,
  type InventorySortOrder,
} from "@/lib/inventory/sort";
import { downloadStockExcel } from "@/lib/inventory/export-stock";
import type { Branch, InventoryItem } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { Diamond, Download, Gem, Plus, Search } from "lucide-react";

const InventoryTable = dynamic(
  () => import("@/app/(components)/inventory/InventoryTable"),
  {
    loading: () => (
      <div className="h-96 rounded-xl border border-zinc-200 bg-white animate-pulse" />
    ),
    ssr: false,
  },
);

const ProductDetailPanel = dynamic(
  () => import("@/app/(components)/ProductDetailPanel"),
  { ssr: false },
);

export default function InventoryPage() {
  const { user } = useAuth();
  const { items, hydrated, loading, error } = useInventory();
  const canAdd = user ? canWriteInventory(user.role) : false;
  const [search, setSearch] = useState("");
  const [metalTab, setMetalTab] = useState<ProductMetalTab>("all");
  const [category, setCategory] = useState("All");
  const [branchFilter, setBranchFilter] = useState("All");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [sortBy, setSortBy] = useState<InventorySortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<InventorySortOrder>("desc");
  const [selectedProduct, setSelectedProduct] = useState<InventoryItem | null>(
    null,
  );

  useEffect(() => {
    fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
  }, []);

  const showBranchColumn = branches.length >= 2;
  const branchOptions = useMemo(
    () => ["All", ...branches.map((branch) => branch.name)],
    [branches],
  );

  const handleSort = useCallback((field: InventorySortField) => {
    const next = toggleSort(sortBy, sortOrder, field);
    setSortBy(next.sortBy);
    setSortOrder(next.sortOrder);
  }, [sortBy, sortOrder]);

  useEffect(() => {
    if (!selectedProduct) return;
    const updated = items.find((item) => item.id === selectedProduct.id);
    if (updated) setSelectedProduct(updated);
  }, [items, selectedProduct?.id]);

  const categories = ["All", ...PRODUCT_CATEGORIES];

  const existingUnitCodes = useMemo(
    () => items.flatMap((i) => i.units.map((u) => u.itemCode)),
    [items],
  );

  const metalStats = useMemo(
    () => getProductMetalStats(items, metalTab),
    [items, metalTab],
  );

  const filtered = useMemo(() => {
    const rows = items.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase()) ||
        item.units.some((u) =>
          u.itemCode.toLowerCase().includes(search.toLowerCase()),
        );
      const matchesCategory =
        category === "All" || item.category === category;
      const matchesMetal = matchesProductMetalTab(item.metal, metalTab);
      const matchesBranch =
        !showBranchColumn ||
        branchFilter === "All" ||
        item.branchName === branchFilter;
      return matchesSearch && matchesCategory && matchesMetal && matchesBranch;
    });

    return sortInventoryItems(rows, sortBy, sortOrder);
  }, [
    items,
    search,
    category,
    metalTab,
    branchFilter,
    showBranchColumn,
    sortBy,
    sortOrder,
  ]);

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={
          metalTab === "all"
            ? `${filtered.length} SKUs - ${items.reduce((s, i) => s + i.stock, 0)} total units`
            : `${filtered.length} SKUs - ${metalStats.activeQty} active units`
        }
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadStockExcel(filtered)}
              disabled={filtered.length === 0}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Download Stock
            </button>
            {canAdd && (
              <Link
                href="/inventory/new"
                className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
              >
                <Plus size={16} />
                Add Stock
              </Link>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
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
      </div>

      {metalTab !== "all" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <StatCard
            label={`Active ${metalTab === "gold" ? "Gold" : "Silver"} Units`}
            value={String(metalStats.activeQty)}
            icon={metalTab === "gold" ? <Gem size={18} /> : <Diamond size={18} />}
          />
          <StatCard
            label={`${metalTab === "gold" ? "Gold" : "Silver"} Stock Value`}
            value={formatCurrency(metalStats.stockValue)}
            icon={metalTab === "gold" ? <Gem size={18} /> : <Diamond size={18} />}
          />
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
            placeholder="Search by name, SKU, or item code..."
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
        {showBranchColumn && (
          <select
            value={branchFilter}
            onChange={(e) => setBranchFilter(e.target.value)}
            className="input-field px-3 py-2 text-sm"
          >
            {branchOptions.map((branchName) => (
              <option key={branchName} value={branchName}>
                {branchName === "All" ? "All Locations" : branchName}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="surface-card overflow-hidden w-full">
        <InventoryTable
          rows={filtered}
          onRowClick={setSelectedProduct}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          showBranchColumn={showBranchColumn}
        />
      </div>

      {selectedProduct && (
        <ProductDetailPanel
          product={selectedProduct}
          existingUnitCodes={existingUnitCodes}
          onClose={() => setSelectedProduct(null)}
          onUpdated={setSelectedProduct}
          onDeleted={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}
