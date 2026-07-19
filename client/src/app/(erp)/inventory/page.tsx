"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import StatCard from "@/app/(components)/StatCard";
import IncomingTransfersPanel from "@/app/(components)/stock-transfer/IncomingTransfersPanel";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import { fetchBranches, fetchUserBranches } from "@/lib/api/branches";
import { useInventory } from "@/lib/inventory/inventory-context";
import {
  applyColumnFilters,
  type ColumnFilters,
  type FilterColumnId,
  type ColumnFilter,
} from "@/lib/inventory/filters";
import { downloadUnitStockExcel } from "@/lib/inventory/export-stock";
import {
  getProductMetalStats,
  matchesProductMetalTab,
  type ProductMetalTab,
} from "@/lib/inventory/metal-stats";
import {
  sortInventoryUnitRows,
  toggleSort,
  type InventorySortField,
  type InventorySortOrder,
} from "@/lib/inventory/sort";
import {
  findProductForUnitRow,
  flattenInventoryToUnitRows,
} from "@/lib/inventory/unit-rows";
import type { Branch } from "@/lib/types";
import { formatCurrency } from "@/lib/format";
import { Diamond, Download, Gem, PackagePlus, Plus, Printer, Search } from "lucide-react";
import {
  rowToBarcodeLabel,
  useBarcodeLabelPrint,
} from "@/app/(components)/inventory/BarcodeLabelPrint";

const InventoryTable = dynamic(
  () => import("@/app/(components)/inventory/InventoryTable"),
  {
    loading: () => (
      <div className="h-96 rounded-xl border border-zinc-200 bg-white animate-pulse" />
    ),
    ssr: false,
  },
);

export default function InventoryPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, hydrated, loading, error } = useInventory();
  const canAdd = user ? canWriteInventory(user.role) : false;
  const isBranchView = user?.role === "Store";
  const [search, setSearch] = useState("");
  const [metalTab, setMetalTab] = useState<ProductMetalTab>("all");
  const [branches, setBranches] = useState<Branch[]>([]);
  const [userBranchName, setUserBranchName] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<InventorySortField>("createdAt");
  const [sortOrder, setSortOrder] = useState<InventorySortOrder>("desc");
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({});
  const { printLabels, sheet: labelPrintSheet } = useBarcodeLabelPrint();

  useEffect(() => {
    fetchBranches()
      .then(setBranches)
      .catch(() => setBranches([]));
    if (isBranchView) {
      fetchUserBranches()
        .then((userBranches) => setUserBranchName(userBranches[0]?.name ?? null))
        .catch(() => setUserBranchName(null));
    }
  }, [isBranchView]);

  const showBranchColumn = branches.length >= 2;

  const handleSort = useCallback(
    (field: InventorySortField) => {
      const next = toggleSort(sortBy, sortOrder, field);
      setSortBy(next.sortBy);
      setSortOrder(next.sortOrder);
    },
    [sortBy, sortOrder],
  );

  const handleColumnFilterChange = useCallback(
    (column: FilterColumnId, filter: ColumnFilter | undefined) => {
      setColumnFilters((current) => {
        const next = { ...current };
        if (!filter) delete next[column];
        else next[column] = filter;
        return next;
      });
    },
    [],
  );

  const allUnitRows = useMemo(
    () => flattenInventoryToUnitRows(items),
    [items],
  );

  const metalStats = useMemo(
    () => getProductMetalStats(items, metalTab),
    [items, metalTab],
  );

  const preColumnFilterRows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return allUnitRows.filter((row) => {
      const matchesSearch =
        !needle ||
        row.name.toLowerCase().includes(needle) ||
        row.sku.toLowerCase().includes(needle) ||
        row.itemCode.toLowerCase().includes(needle);
      const matchesMetal = matchesProductMetalTab(row.metal, metalTab);
      return matchesSearch && matchesMetal;
    });
  }, [allUnitRows, search, metalTab]);

  const filteredRows = useMemo(() => {
    const filtered = applyColumnFilters(preColumnFilterRows, columnFilters);
    return sortInventoryUnitRows(filtered, sortBy, sortOrder);
  }, [preColumnFilterRows, columnFilters, sortBy, sortOrder]);

  const uniqueSkuCount = useMemo(
    () => new Set(filteredRows.map((row) => row.sku)).size,
    [filteredRows],
  );

  const handleEditUnitRow = useCallback(
    (row: (typeof filteredRows)[number]) => {
      const product = findProductForUnitRow(items, row);
      if (product) router.push(`/inventory/${product.id}/edit`);
    },
    [items, router],
  );

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      {labelPrintSheet}
      <PageHeader
        title={
          isBranchView && userBranchName
            ? `${userBranchName} Stock`
            : "Central Stock"
        }
        subtitle={
          metalTab === "all"
            ? `${filteredRows.length} items across ${uniqueSkuCount} SKUs`
            : `${filteredRows.length} ${metalTab} items · ${metalStats.activeQty} active units`
        }
        action={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadUnitStockExcel(filteredRows)}
              disabled={filteredRows.length === 0}
              className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download size={16} />
              Download Stock
            </button>
            {canAdd && (
              <>
                <Link
                  href="/inventory/add-units"
                  className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <PackagePlus size={16} />
                  Add Units to SKU
                </Link>
                <Link
                  href="/inventory/new"
                  className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
                >
                  <Plus size={16} />
                  Add Stock
                </Link>
              </>
            )}
          </div>
        }
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <IncomingTransfersPanel />

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
            placeholder="Search by name, SKU, or item code…"
          />
        </div>
        <span className="filter-count">
          Showing {filteredRows.length} of {allUnitRows.length}
        </span>
      </div>

      {metalTab !== "all" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <StatCard
            label={`Active ${metalTab === "gold" ? "Gold" : "Silver"} Units`}
            value={String(metalStats.activeQty)}
            icon={
              metalTab === "gold" ? <Gem size={18} /> : <Diamond size={18} />
            }
          />
          <StatCard
            label={`${metalTab === "gold" ? "Gold" : "Silver"} Stock Value`}
            value={formatCurrency(metalStats.stockValue)}
            icon={
              metalTab === "gold" ? <Gem size={18} /> : <Diamond size={18} />
            }
          />
        </div>
      )}

      <div className="surface-card overflow-hidden w-full">
        <InventoryTable
          rows={filteredRows}
          filterSourceRows={preColumnFilterRows}
          columnFilters={columnFilters}
          onColumnFilterChange={handleColumnFilterChange}
          onClearAllFilters={() => setColumnFilters({})}
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSort={handleSort}
          showBranchColumn={showBranchColumn}
          canWrite={canAdd}
          onEditProduct={handleEditUnitRow}
          onPrintLabels={(rows) =>
            printLabels(rows.map((row) => rowToBarcodeLabel(row)))
          }
        />
      </div>
    </div>
  );
}
