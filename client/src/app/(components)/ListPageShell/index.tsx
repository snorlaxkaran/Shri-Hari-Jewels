"use client";

import type { ReactNode } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";

export type ListFilterOption = {
  value: string;
  label: string;
};

export type ListPageShellProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  loading?: boolean;
  error?: string | null;
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  filterLabel?: string;
  filterValue?: string;
  filterOptions?: ListFilterOption[];
  onFilterChange?: (value: string) => void;
  countLabel?: string;
  bulkActions?: ReactNode;
  selectedCount?: number;
  emptyMessage?: string;
  isEmpty?: boolean;
  children: ReactNode;
};

export default function ListPageShell({
  title,
  subtitle,
  action,
  loading,
  error,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  filterValue,
  filterOptions,
  onFilterChange,
  countLabel,
  bulkActions,
  selectedCount = 0,
  emptyMessage,
  isEmpty,
  children,
}: ListPageShellProps) {
  if (loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader title={title} subtitle={subtitle} action={action} />

      {error ? <div className="alert-error mb-4">{error}</div> : null}

      {(onSearchChange || filterOptions || countLabel || bulkActions) && (
        <div className="filter-bar">
          {onSearchChange ? (
            <div className="filter-search">
              <input
                type="search"
                value={searchValue ?? ""}
                onChange={(e) => onSearchChange(e.target.value)}
                placeholder={searchPlaceholder ?? "Search…"}
              />
            </div>
          ) : null}
          {filterOptions && onFilterChange ? (
            <select
              value={filterValue}
              onChange={(e) => onFilterChange(e.target.value)}
              className="filter-select"
            >
              {filterOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : null}
          {selectedCount > 0 && bulkActions ? (
            <div className="list-bulk-actions">{bulkActions}</div>
          ) : null}
          {countLabel ? <span className="filter-count">{countLabel}</span> : null}
        </div>
      )}

      {isEmpty ? (
        <div className="list-empty-state">{emptyMessage ?? "No records found."}</div>
      ) : (
        children
      )}
    </div>
  );
}
