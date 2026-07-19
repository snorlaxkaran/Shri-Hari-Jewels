"use client";

import { useMemo, useState } from "react";
import RowActionsDropdown from "@/app/(components)/RowActionsDropdown";
import StatusBadge from "@/app/(components)/StatusBadge";
import ItemCodeLink from "@/app/(components)/inventory/ItemCodeLink";
import { isInactiveUnit } from "@/lib/inventory/unit-status";
import ActiveFiltersBar from "@/app/(components)/inventory/ActiveFiltersBar";
import ColumnFilterPopover from "@/app/(components)/inventory/ColumnFilterPopover";
import {
  DEFAULT_AGEING_THRESHOLDS,
  formatAgeInDays,
  getAgeInDays,
  getAgeingLevel,
  getUnitAgeingDate,
  type AgeingThresholds,
} from "@/lib/inventory/ageing";
import {
  getDistinctColumnValues,
  isFilterActive,
  type ColumnFilter,
  type ColumnFilters,
  type FilterColumnId,
} from "@/lib/inventory/filters";
import {
  isHallmarkedUnit,
  isHallmarkPending,
  requiresHallmark,
  getUnitSaleStatus,
} from "@/lib/inventory/hallmark-filter";
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
  canManageHallmark?: boolean;
  onEditProduct: (row: InventoryUnitRow) => void;
  onSetAside?: (row: InventoryUnitRow) => void;
  onReleaseHold?: (row: InventoryUnitRow) => void;
  onUpdateHallmark?: (row: InventoryUnitRow) => void;
};

type ColumnDef = {
  id: FilterColumnId | "photo" | "ageing" | "hallmark" | "actions";
  label: string;
  sortField?: InventorySortField;
  filterColumn?: FilterColumnId;
};

const BASE_COLUMNS: ColumnDef[] = [
  { id: "photo", label: "" },
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
  { id: "hallmark", label: "Hallmark" },
  { id: "actions", label: "" },
];

function AgeingBadge({
  row,
  thresholds = DEFAULT_AGEING_THRESHOLDS,
}: {
  row: InventoryUnitRow;
  thresholds?: AgeingThresholds;
}) {
  const ageingDate = getUnitAgeingDate(row);
  const days = getAgeInDays(ageingDate);
  const level = getAgeingLevel(ageingDate, thresholds);

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

  if (!column.sortField && (column.id === "actions" || column.id === "photo")) {
    return (
      <th
        className={column.id === "photo" ? "col-photo" : "text-right w-16"}
        style={{ padding: column.id === "photo" ? "3px 6px" : "8px 12px" }}
      >
        {column.label}
      </th>
    );
  }

  return (
    <th className="relative" style={{ padding: "8px 12px" }}>
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
  canManageHallmark = false,
  onEditProduct,
  onSetAside,
  onReleaseHold,
  onUpdateHallmark,
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
      case "photo":
        return (
          <td className="col-photo">
            {row.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={row.imageUrl}
                alt={row.name}
                loading="lazy"
                className="inventory-photo"
              />
            ) : (
              <div
                className="inventory-photo inventory-photo-placeholder"
                style={{ backgroundColor: row.imageColor || "var(--bg-muted)" }}
                aria-hidden
              />
            )}
          </td>
        );
      case "itemCode":
        return (
          <td className="td-code">
            <ItemCodeLink itemCode={row.itemCode} />
          </td>
        );
      case "sku":
        return (
          <td className="td-mono td-muted">{row.sku}</td>
        );
      case "name":
        return (
          <td>
            <span className="font-medium line-clamp-3 min-w-[160px]">{row.name}</span>
          </td>
        );
      case "category":
        return <td className="td-muted">{row.category}</td>;
      case "metal":
        return <td className="td-muted">{row.metal}</td>;
      case "purity":
        return <td className="td-muted">{row.purity}</td>;
      case "weightGrams":
        return <td className="td-num">{row.weightGrams}g</td>;
      case "price":
        return (
          <td className="td-num">
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
          <td className="td-muted">
            {formatDate(row.createdAt)}
          </td>
        );
      case "ageing":
        return (
          <td>
            <AgeingBadge row={row} thresholds={ageingThresholds} />
          </td>
        );
      case "branchName":
        return (
          <td className="td-muted">{row.branchName ?? "—"}</td>
        );
      case "status":
        return (
          <td>
            <div className="flex flex-col gap-1 min-w-[120px]">
              {row.heldForCustomerName ? (
                <>
                  <StatusBadge status="Set aside" />
                  <span className="inline-flex w-fit max-w-[180px] truncate rounded-md bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900">
                    {row.heldForCustomerName}
                  </span>
                </>
              ) : row.reservedForCustomerName ? (
                <>
                  <StatusBadge status="Reserved" />
                  <span className="text-xs font-medium text-blue-700">
                    Payment pending
                  </span>
                  <span className="inline-flex w-fit max-w-[180px] truncate rounded-md bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-900">
                    {row.reservedForCustomerName}
                  </span>
                </>
              ) : (
                <StatusBadge status={getUnitSaleStatus(row)} />
              )}
            </div>
          </td>
        );
      case "hallmark":
        return (
          <td>
            {!requiresHallmark(row) ? (
              <span className="text-xs text-zinc-400">Exempt</span>
            ) : isHallmarkedUnit(row) ? (
              <span className="text-xs font-mono text-emerald-700">
                {row.huid ?? row.hallmarkNumber}
              </span>
            ) : (
              <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-amber-200">
                Needs HUID
              </span>
            )}
          </td>
        );
      case "actions":
        return (
          <td className="text-right">
            {canWrite && (
              <RowActionsDropdown
                actions={[
                  ...(row.status === "Available" &&
                  isHallmarkPending(row) &&
                  canManageHallmark
                    ? [
                        {
                          label: "Record HUID",
                          onClick: () => onUpdateHallmark?.(row),
                        },
                      ]
                    : []),
                  ...(row.status === "Available"
                    ? [
                        {
                          label: "Set aside for customer",
                          onClick: () => onSetAside?.(row),
                        },
                      ]
                    : []),
                  ...(row.heldForCustomerName
                    ? [
                        {
                          label: "Release hold",
                          onClick: () => onReleaseHold?.(row),
                        },
                      ]
                    : []),
                  {
                    label: "Edit",
                    onClick: () => onEditProduct(row),
                  },
                ]}
              />
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
      <div className="data-table-wrap">
        <table className="data-table inventory-table min-w-[1280px]">
          <thead>
            <tr>
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
                  className={isInactiveUnit(row.status) ? "opacity-80" : ""}
                >
                  {columns.map((column) => renderCell(row, column))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {rows.length > 0 && (
        <div className="table-pagination">
          <span>
            Showing 1–{rows.length} of {rows.length} items
          </span>
          <div className="table-pagination-actions">
            <button type="button" className="btn-secondary" disabled>
              Previous
            </button>
            <button type="button" className="btn-secondary" disabled>
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
