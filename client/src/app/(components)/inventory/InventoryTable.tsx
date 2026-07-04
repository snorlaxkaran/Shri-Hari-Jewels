"use client";

import { useMemo, useState } from "react";
import StatusBadge from "@/app/(components)/StatusBadge";
import ActiveFiltersBar from "@/app/(components)/inventory/ActiveFiltersBar";
import ColumnFilterPopover from "@/app/(components)/inventory/ColumnFilterPopover";
import {
  DEFAULT_AGEING_THRESHOLDS,
  formatAgeInDays,
  getAgeInDays,
  getAgeingLevel,
  type AgeingThresholds,
} from "@/lib/inventory/ageing";
import {
  getDistinctColumnValues,
  isFilterActive,
  type ColumnFilter,
  type ColumnFilters,
  type FilterColumnId,
} from "@/lib/inventory/filters";
import type {
  InventorySortField,
  InventorySortOrder,
} from "@/lib/inventory/sort";
import type { InventoryUnitRow } from "@/lib/inventory/unit-rows";
import { formatCurrency, formatDate } from "@/lib/format";
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Filter,
  Pencil,
} from "lucide-react";

type InventoryTableProps = {
  rows: InventoryUnitRow[];
  filterSourceRows: InventoryUnitRow[];
  columnFilters: ColumnFilters;
  onColumnFilterChange: (
    column: FilterColumnId,
    filter: ColumnFilter | undefined,
  ) => void;
  onClearAllFilters: () => void;
  sortBy: InventorySortField;
  sortOrder: InventorySortOrder;
  onSort: (field: InventorySortField) => void;
  showBranchColumn?: boolean;
  ageingThresholds?: AgeingThresholds;
  canWrite?: boolean;
  onEditProduct: (row: InventoryUnitRow) => void;
};

type ColumnDef = {
  id: FilterColumnId | "ageing" | "actions";
  label: string;
  sortField?: InventorySortField;
  filterColumn?: FilterColumnId;
};

const BASE_COLUMNS: ColumnDef[] = [
  { id: "itemCode", label: "Item Code", sortField: "itemCode", filterColumn: "itemCode" },
  { id: "sku", label: "SKU", sortField: "sku", filterColumn: "sku" },
  { id: "name", label: "Product", sortField: "name", filterColumn: "name" },
  { id: "category", label: "Category", sortField: "category", filterColumn: "category" },
  { id: "metal", label: "Metal", sortField: "metal", filterColumn: "metal" },
  { id: "purity", label: "Purity", sortField: "purity", filterColumn: "purity" },
  { id: "weightGrams", label: "Weight", sortField: "weightGrams", filterColumn: "weightGrams" },
  { id: "price", label: "Price", sortField: "price", filterColumn: "price" },
  { id: "createdAt", label: "Added On", sortField: "createdAt", filterColumn: "createdAt" },
  { id: "ageing", label: "Ageing", sortField: "ageing" },
  { id: "branchName", label: "Location", sortField: "branchName", filterColumn: "branchName" },
  { id: "status", label: "Status", sortField: "status", filterColumn: "status" },
  { id: "actions", label: "" },
];

function AgeingBadge({
  createdAt,
  thresholds = DEFAULT_AGEING_THRESHOLDS,
}: {
  createdAt: string;
  thresholds?: AgeingThresholds;
}) {
  const days = getAgeInDays(createdAt);
  const level = getAgeingLevel(createdAt, thresholds);

  if (level === "aged") {
    return (
      <span className="inline-flex items-center rounded-full bg-red-50 px-2 py-0.5 text-[11px] font-medium text-red-700 ring-1 ring-red-200">
        Aged Stock
      </span>
    );
  }

  if (level === "ageing") {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
        Ageing
      </span>
    );
  }

  return <span className="text-zinc-600">{formatAgeInDays(days)}</span>;
}

function ColumnHeader({
  column,
  sortBy,
  sortOrder,
  onSort,
  filter,
  distinctValues,
  isFilterOpen,
  onToggleFilter,
  onApplyFilter,
  onCloseFilter,
}: {
  column: ColumnDef;
  sortBy: InventorySortField;
  sortOrder: InventorySortOrder;
  onSort: (field: InventorySortField) => void;
  filter: ColumnFilter | undefined;
  distinctValues: string[];
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  onApplyFilter: (filter: ColumnFilter | undefined) => void;
  onCloseFilter: () => void;
}) {
  const active = column.sortField ? sortBy === column.sortField : false;
  const SortIcon = active
    ? sortOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;
  const filterActive = isFilterActive(filter);

  if (!column.sortField && column.id === "actions") {
    return (
      <th className="px-3 py-3 text-right font-medium text-zinc-500 w-16">
        {column.label}
      </th>
    );
  }

  return (
    <th className="relative px-3 py-3 font-medium text-zinc-500">
      <div className="flex items-center gap-1">
        {column.sortField ? (
          <button
            type="button"
            onClick={() => onSort(column.sortField!)}
            className={`inline-flex items-center gap-0.5 transition-colors ${
              active ? "text-zinc-800" : "hover:text-zinc-700"
            }`}
          >
            {column.label}
            <SortIcon size={13} className={active ? "opacity-100" : "opacity-40"} />
          </button>
        ) : (
          <span>{column.label}</span>
        )}
        {column.filterColumn && (
          <button
            type="button"
            onClick={onToggleFilter}
            className={`rounded p-0.5 transition-colors ${
              filterActive
                ? "text-blue-600 bg-blue-50"
                : "text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
            }`}
            aria-label={`Filter ${column.label}`}
          >
            <Filter size={13} />
          </button>
        )}
      </div>
      {isFilterOpen && column.filterColumn && (
        <ColumnFilterPopover
          column={column.filterColumn}
          filter={filter}
          distinctValues={distinctValues}
          onApply={onApplyFilter}
          onClose={onCloseFilter}
        />
      )}
    </th>
  );
}

export default function InventoryTable({
  rows,
  filterSourceRows,
  columnFilters,
  onColumnFilterChange,
  onClearAllFilters,
  sortBy,
  sortOrder,
  onSort,
  showBranchColumn = false,
  ageingThresholds = DEFAULT_AGEING_THRESHOLDS,
  canWrite = false,
  onEditProduct,
}: InventoryTableProps) {
  const [openFilterColumn, setOpenFilterColumn] =
    useState<FilterColumnId | null>(null);

  const columns = useMemo(
    () =>
      showBranchColumn
        ? BASE_COLUMNS
        : BASE_COLUMNS.filter((column) => column.id !== "branchName"),
    [showBranchColumn],
  );

  const distinctByColumn = useMemo(() => {
    const map = new Map<FilterColumnId, string[]>();
    for (const column of columns) {
      if (!column.filterColumn) continue;
      map.set(
        column.filterColumn,
        getDistinctColumnValues(filterSourceRows, column.filterColumn),
      );
    }
    return map;
  }, [columns, filterSourceRows]);

  const columnCount = columns.length;

  const renderCell = (row: InventoryUnitRow, column: ColumnDef) => {
    switch (column.id) {
      case "itemCode":
        return (
          <td className="px-3 py-2.5 font-mono text-[12px] text-zinc-700">
            {row.itemCode}
          </td>
        );
      case "sku":
        return (
          <td className="px-3 py-2.5 font-mono text-[12px] text-zinc-500">
            {row.sku}
          </td>
        );
      case "name":
        return (
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2 min-w-[160px]">
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={row.imageUrl}
                  alt={row.name}
                  loading="lazy"
                  className="h-9 w-9 flex-shrink-0 rounded-lg border object-cover"
                  style={{ borderColor: "var(--border)" }}
                />
              ) : (
                <div
                  className="h-9 w-9 flex-shrink-0 rounded-lg"
                  style={{ backgroundColor: "var(--bg-muted)" }}
                />
              )}
              <span className="font-medium text-[13px] line-clamp-2">{row.name}</span>
            </div>
          </td>
        );
      case "category":
        return <td className="px-3 py-2.5">{row.category}</td>;
      case "metal":
        return <td className="px-3 py-2.5">{row.metal}</td>;
      case "purity":
        return <td className="px-3 py-2.5">{row.purity}</td>;
      case "weightGrams":
        return <td className="px-3 py-2.5">{row.weightGrams}g</td>;
      case "price":
        return (
          <td className="px-3 py-2.5">
            <div>{formatCurrency(row.price)}</div>
            {row.priceSource === "sold" && (
              <p className="text-[10px] text-zinc-400">Sold at</p>
            )}
            {row.priceSource === "live" && (
              <p className="text-[10px] text-zinc-400">Live</p>
            )}
          </td>
        );
      case "createdAt":
        return (
          <td className="px-3 py-2.5 text-zinc-600">
            {formatDate(row.createdAt)}
          </td>
        );
      case "ageing":
        return (
          <td className="px-3 py-2.5">
            <AgeingBadge createdAt={row.createdAt} thresholds={ageingThresholds} />
          </td>
        );
      case "branchName":
        return (
          <td className="px-3 py-2.5 text-zinc-600">{row.branchName ?? "—"}</td>
        );
      case "status":
        return (
          <td className="px-3 py-2.5">
            <StatusBadge status={row.status} />
          </td>
        );
      case "actions":
        return (
          <td className="px-3 py-2.5 text-right">
            {canWrite && (
              <button
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onEditProduct(row);
                }}
                className="inline-flex items-center justify-center rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-700"
                aria-label={`Edit ${row.sku}`}
                title="Edit product"
              >
                <Pencil size={15} />
              </button>
            )}
          </td>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <ActiveFiltersBar
        filters={columnFilters}
        onRemove={(column) => onColumnFilterChange(column, undefined)}
        onClearAll={onClearAllFilters}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1280px] text-sm">
          <thead>
            <tr className="bg-zinc-50 text-zinc-500">
              {columns.map((column) => (
                <ColumnHeader
                  key={column.id}
                  column={column}
                  sortBy={sortBy}
                  sortOrder={sortOrder}
                  onSort={onSort}
                  filter={
                    column.filterColumn
                      ? columnFilters[column.filterColumn]
                      : undefined
                  }
                  distinctValues={
                    column.filterColumn
                      ? (distinctByColumn.get(column.filterColumn) ?? [])
                      : []
                  }
                  isFilterOpen={openFilterColumn === column.filterColumn}
                  onToggleFilter={() =>
                    setOpenFilterColumn((current) =>
                      current === column.filterColumn
                        ? null
                        : (column.filterColumn ?? null),
                    )
                  }
                  onApplyFilter={(filter) => {
                    if (column.filterColumn) {
                      onColumnFilterChange(column.filterColumn, filter);
                    }
                    setOpenFilterColumn(null);
                  }}
                  onCloseFilter={() => setOpenFilterColumn(null)}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columnCount}
                  className="px-5 py-8 text-center text-sm text-zinc-400"
                >
                  No items match your filters.
                </td>
              </tr>
            ) : (
              rows.map((row) => (
                <tr
                  key={row.unitId}
                  className="border-t border-zinc-100 text-zinc-900 transition-colors hover:bg-zinc-50"
                >
                  {columns.map((column) => renderCell(row, column))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
