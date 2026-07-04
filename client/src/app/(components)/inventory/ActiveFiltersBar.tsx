"use client";

import { X } from "lucide-react";
import {
  formatFilterChipLabel,
  isFilterActive,
  type ColumnFilters,
  type FilterColumnId,
} from "@/lib/inventory/filters";

type ActiveFiltersBarProps = {
  filters: ColumnFilters;
  onRemove: (column: FilterColumnId) => void;
  onClearAll: () => void;
};

export default function ActiveFiltersBar({
  filters,
  onRemove,
  onClearAll,
}: ActiveFiltersBarProps) {
  const activeEntries = (
    Object.entries(filters) as [FilterColumnId, ColumnFilters[FilterColumnId]][]
  ).filter(([, filter]) => filter && isFilterActive(filter));

  if (activeEntries.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-zinc-100 bg-zinc-50/80 px-4 py-2">
      <span className="text-xs font-medium text-zinc-500">Active filters:</span>
      {activeEntries.map(([column, filter]) => (
        <button
          key={column}
          type="button"
          onClick={() => onRemove(column)}
          className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs text-zinc-700 ring-1 ring-zinc-200 transition-colors hover:bg-zinc-100"
        >
          {formatFilterChipLabel(column, filter!)}
          <X size={12} className="text-zinc-400" />
        </button>
      ))}
      <button
        type="button"
        onClick={onClearAll}
        className="text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        Clear all filters
      </button>
    </div>
  );
}
