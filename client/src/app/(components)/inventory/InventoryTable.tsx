"use client";

import StatusBadge from "@/app/(components)/StatusBadge";
import {
  DEFAULT_AGEING_THRESHOLDS,
  formatAgeInDays,
  getAgeInDays,
  getAgeingLevel,
  type AgeingThresholds,
} from "@/lib/inventory/ageing";
import type {
  InventorySortField,
  InventorySortOrder,
} from "@/lib/inventory/sort";
import { formatCurrency, formatDate } from "@/lib/format";
import type { InventoryItem } from "@/lib/types";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type InventoryTableProps = {
  rows: InventoryItem[];
  onRowClick: (item: InventoryItem) => void;
  sortBy: InventorySortField;
  sortOrder: InventorySortOrder;
  onSort: (field: InventorySortField) => void;
  showBranchColumn?: boolean;
  ageingThresholds?: AgeingThresholds;
};

function SortableHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
  className = "",
}: {
  label: string;
  field: InventorySortField;
  sortBy: InventorySortField;
  sortOrder: InventorySortOrder;
  onSort: (field: InventorySortField) => void;
  className?: string;
}) {
  const active = sortBy === field;
  const Icon = active
    ? sortOrder === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  return (
    <th className={`text-left px-5 py-3 font-medium ${className}`}>
      <button
        type="button"
        onClick={() => onSort(field)}
        className={`inline-flex items-center gap-1 transition-colors ${
          active ? "text-zinc-800" : "text-zinc-500 hover:text-zinc-700"
        }`}
      >
        {label}
        <Icon size={14} className={active ? "opacity-100" : "opacity-40"} />
      </button>
    </th>
  );
}

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

  return (
    <span className="text-zinc-600">{formatAgeInDays(days)}</span>
  );
}

export default function InventoryTable({
  rows,
  onRowClick,
  sortBy,
  sortOrder,
  onSort,
  showBranchColumn = false,
  ageingThresholds = DEFAULT_AGEING_THRESHOLDS,
}: InventoryTableProps) {
  const columnCount = showBranchColumn ? 10 : 9;

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[980px] text-sm">
        <thead>
          <tr className="bg-zinc-50 text-zinc-500">
            <th className="text-left px-5 py-3 font-medium">Product</th>
            <SortableHeader
              label="Category"
              field="category"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <th className="text-left px-5 py-3 font-medium">Metal</th>
            <SortableHeader
              label="Weight"
              field="weightGrams"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <th className="text-left px-5 py-3 font-medium">Qty</th>
            <SortableHeader
              label="Price"
              field="price"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader
              label="Added On"
              field="createdAt"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            <SortableHeader
              label="Ageing"
              field="ageing"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={onSort}
            />
            {showBranchColumn && (
              <th className="text-left px-5 py-3 font-medium">Location</th>
            )}
            <th className="text-left px-5 py-3 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td
                colSpan={columnCount}
                className="px-5 py-8 text-center text-sm text-zinc-400"
              >
                No products match your filters.
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                onClick={() => onRowClick(row)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onRowClick(row);
                  }
                }}
                className="cursor-pointer border-t border-zinc-100 text-zinc-900 outline-none transition-colors hover:bg-zinc-50 focus:bg-zinc-50"
              >
                <td className="px-5 py-3">
                  <div className="flex items-center gap-2">
                    {row.images?.[0]?.url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={row.images[0].url}
                        alt={row.name}
                        loading="lazy"
                        className="w-11 h-11 rounded-lg flex-shrink-0 object-cover border"
                        style={{ borderColor: "var(--border)" }}
                      />
                    ) : (
                      <div
                        className="w-11 h-11 rounded-lg flex-shrink-0"
                        style={{ backgroundColor: "var(--bg-muted)" }}
                      />
                    )}
                    <div>
                      <p className="font-medium text-[13px]">{row.name}</p>
                      <p className="text-[11px] font-mono text-zinc-400">
                        {row.sku}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3">{row.category}</td>
                <td className="px-5 py-3">
                  {row.metal} {row.purity}
                </td>
                <td className="px-5 py-3">{row.weightGrams}g</td>
                <td className="px-5 py-3 font-medium">{row.stock}</td>
                <td className="px-5 py-3">{formatCurrency(row.price)}</td>
                <td className="px-5 py-3 text-zinc-600">
                  {formatDate(row.createdAt)}
                </td>
                <td className="px-5 py-3">
                  <AgeingBadge
                    createdAt={row.createdAt}
                    thresholds={ageingThresholds}
                  />
                </td>
                {showBranchColumn && (
                  <td className="px-5 py-3 text-zinc-600">
                    {row.branchName ?? "—"}
                  </td>
                )}
                <td className="px-5 py-3">
                  <StatusBadge status={row.status} />
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
