"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import { useInventory } from "@/lib/inventory/inventory-context";
import {
  matchesProductMetalTab,
  type ProductMetalTab,
} from "@/lib/inventory/metal-stats";
import type { InventoryItem } from "@/lib/types";
import { Search } from "lucide-react";

const ProductTable = dynamic(
  () => import("@/app/(components)/products/ProductTable"),
  {
    loading: () => (
      <div className="h-96 rounded-xl border border-zinc-200 bg-white animate-pulse" />
    ),
    ssr: false,
  },
);

function sortProducts(items: InventoryItem[]): InventoryItem[] {
  return [...items].sort((a, b) => a.sku.localeCompare(b.sku));
}

export default function ProductsPage() {
  const { user } = useAuth();
  const { items, hydrated, loading, error } = useInventory();
  const canWrite = user ? canWriteInventory(user.role) : false;
  const [search, setSearch] = useState("");
  const [metalTab, setMetalTab] = useState<ProductMetalTab>("all");

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return sortProducts(
      items.filter((product) => {
        const matchesSearch =
          !needle ||
          product.name.toLowerCase().includes(needle) ||
          product.sku.toLowerCase().includes(needle) ||
          product.category.toLowerCase().includes(needle);
        const matchesMetal = matchesProductMetalTab(product.metal, metalTab);
        return matchesSearch && matchesMetal;
      }),
    );
  }, [items, search, metalTab]);

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <PageHeader
        title="Product"
        subtitle={`${filtered.length} SKUs — shared catalog config for all units`}
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
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
            placeholder="Search by name, SKU, or category…"
          />
        </div>
        <span className="filter-count">
          Showing {filtered.length} of {items.length}
        </span>
      </div>

      <div className="surface-card overflow-hidden w-full">
        <ProductTable products={filtered} canWrite={canWrite} />
      </div>
    </div>
  );
}
