import { formatDate } from "@/lib/format";
import type { InventoryUnitRow } from "./unit-rows";

export type FilterColumnId =
  | "itemCode"
  | "sku"
  | "name"
  | "category"
  | "metal"
  | "purity"
  | "weightGrams"
  | "price"
  | "status"
  | "branchName"
  | "createdAt";

export type TextFilterOperator =
  | "contains"
  | "equals"
  | "startsWith"
  | "endsWith"
  | "notContains";

export type NumberFilterOperator = "equals" | "gt" | "lt" | "between";

export type DateFilterOperator = "before" | "after" | "between";

export type TextColumnFilter = {
  kind: "text";
  operator: TextFilterOperator;
  value: string;
};

export type NumberColumnFilter = {
  kind: "number";
  operator: NumberFilterOperator;
  value: number;
  valueTo?: number;
};

export type DateColumnFilter = {
  kind: "date";
  operator: DateFilterOperator;
  value: string;
  valueTo?: string;
};

export type ChecklistColumnFilter = {
  kind: "checklist";
  values: string[];
};

export type ColumnFilter =
  | TextColumnFilter
  | NumberColumnFilter
  | DateColumnFilter
  | ChecklistColumnFilter;

export type ColumnFilters = Partial<Record<FilterColumnId, ColumnFilter>>;

export const FILTER_COLUMN_LABELS: Record<FilterColumnId, string> = {
  itemCode: "Item Code",
  sku: "SKU",
  name: "Product",
  category: "Category",
  metal: "Metal",
  purity: "Purity",
  weightGrams: "Weight",
  price: "Price",
  status: "Status",
  branchName: "Location",
  createdAt: "Added On",
};

export const CHECKLIST_FILTER_COLUMNS = new Set<FilterColumnId>([
  "category",
  "metal",
  "purity",
  "status",
  "branchName",
]);

export const TEXT_FILTER_COLUMNS = new Set<FilterColumnId>([
  "itemCode",
  "sku",
  "name",
  "category",
  "metal",
  "purity",
  "status",
  "branchName",
]);

export const NUMBER_FILTER_COLUMNS = new Set<FilterColumnId>([
  "weightGrams",
  "price",
]);

export const DATE_FILTER_COLUMNS = new Set<FilterColumnId>(["createdAt"]);

const CHECKLIST_THRESHOLD = 25;

export const shouldUseChecklist = (
  column: FilterColumnId,
  distinctCount: number,
) =>
  CHECKLIST_FILTER_COLUMNS.has(column) &&
  distinctCount > 0 &&
  distinctCount <= CHECKLIST_THRESHOLD;

const getTextValue = (row: InventoryUnitRow, column: FilterColumnId): string => {
  switch (column) {
    case "itemCode":
      return row.itemCode;
    case "sku":
      return row.sku;
    case "name":
      return row.name;
    case "category":
      return row.category;
    case "metal":
      return row.metal;
    case "purity":
      return row.purity;
    case "status":
      return row.status;
    case "branchName":
      return row.branchName ?? "";
    default:
      return "";
  }
};

const getNumberValue = (row: InventoryUnitRow, column: FilterColumnId): number => {
  if (column === "weightGrams") return row.weightGrams;
  if (column === "price") return row.price;
  return 0;
};

const normalizeText = (value: string) => value.trim().toLowerCase();

const matchTextOperator = (
  haystack: string,
  operator: TextFilterOperator,
  needle: string,
): boolean => {
  const left = normalizeText(haystack);
  const right = normalizeText(needle);
  if (!right) return true;

  switch (operator) {
    case "contains":
      return left.includes(right);
    case "equals":
      return left === right;
    case "startsWith":
      return left.startsWith(right);
    case "endsWith":
      return left.endsWith(right);
    case "notContains":
      return !left.includes(right);
  }
};

const startOfDay = (iso: string) => {
  const date = new Date(iso);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

const matchDateFilter = (
  rowValue: string,
  filter: DateColumnFilter,
): boolean => {
  if (!filter.value) return true;
  const rowTime = startOfDay(rowValue);
  const valueTime = startOfDay(filter.value);

  switch (filter.operator) {
    case "before":
      return rowTime < valueTime;
    case "after":
      return rowTime > valueTime;
    case "between": {
      if (!filter.valueTo) return true;
      const endTime = startOfDay(filter.valueTo);
      return rowTime >= valueTime && rowTime <= endTime;
    }
  }
};

const matchNumberFilter = (
  rowValue: number,
  filter: NumberColumnFilter,
): boolean => {
  switch (filter.operator) {
    case "equals":
      return rowValue === filter.value;
    case "gt":
      return rowValue > filter.value;
    case "lt":
      return rowValue < filter.value;
    case "between": {
      if (filter.valueTo == null) return true;
      const min = Math.min(filter.value, filter.valueTo);
      const max = Math.max(filter.value, filter.valueTo);
      return rowValue >= min && rowValue <= max;
    }
  }
};

export const isFilterActive = (filter: ColumnFilter | undefined): boolean => {
  if (!filter) return false;
  if (filter.kind === "checklist") return filter.values.length > 0;
  if (filter.kind === "text") return filter.value.trim().length > 0;
  if (filter.kind === "number") {
    if (filter.operator === "between") {
      return Number.isFinite(filter.value) && Number.isFinite(filter.valueTo);
    }
    return Number.isFinite(filter.value);
  }
  if (filter.kind === "date") {
    if (filter.operator === "between") {
      return Boolean(filter.value && filter.valueTo);
    }
    return Boolean(filter.value);
  }
  return false;
};

const matchesFilter = (
  row: InventoryUnitRow,
  column: FilterColumnId,
  filter: ColumnFilter,
): boolean => {
  if (!isFilterActive(filter)) return true;

  if (filter.kind === "checklist") {
    const value = getTextValue(row, column);
    return filter.values.includes(value);
  }

  if (filter.kind === "text") {
    return matchTextOperator(getTextValue(row, column), filter.operator, filter.value);
  }

  if (filter.kind === "number") {
    return matchNumberFilter(getNumberValue(row, column), filter);
  }

  if (filter.kind === "date") {
    return matchDateFilter(row.createdAt, filter);
  }

  return true;
};

export const applyColumnFilters = (
  rows: InventoryUnitRow[],
  filters: ColumnFilters,
): InventoryUnitRow[] =>
  rows.filter((row) =>
    (Object.entries(filters) as [FilterColumnId, ColumnFilter][]).every(
      ([column, filter]) => matchesFilter(row, column, filter),
    ),
  );

export const getDistinctColumnValues = (
  rows: InventoryUnitRow[],
  column: FilterColumnId,
): string[] => {
  const values = new Set<string>();
  for (const row of rows) {
    if (TEXT_FILTER_COLUMNS.has(column) || CHECKLIST_FILTER_COLUMNS.has(column)) {
      const value = getTextValue(row, column);
      if (value) values.add(value);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b, "en-IN"));
};

export const formatFilterChipLabel = (
  column: FilterColumnId,
  filter: ColumnFilter,
): string => {
  const label = FILTER_COLUMN_LABELS[column];

  if (filter.kind === "checklist") {
    if (filter.values.length === 1) return `${label}: ${filter.values[0]}`;
    return `${label}: ${filter.values.length} selected`;
  }

  if (filter.kind === "text") {
    const op =
      filter.operator === "notContains"
        ? "≠"
        : filter.operator === "equals"
          ? "="
          : "~";
    return `${label} ${op} ${filter.value}`;
  }

  if (filter.kind === "number") {
    if (filter.operator === "between" && filter.valueTo != null) {
      return `${label}: ${filter.value}–${filter.valueTo}`;
    }
    if (filter.operator === "gt") return `${label} > ${filter.value}`;
    if (filter.operator === "lt") return `${label} < ${filter.value}`;
    return `${label} = ${filter.value}`;
  }

  if (filter.kind === "date") {
    if (filter.operator === "between" && filter.valueTo) {
      return `${label}: ${formatDate(filter.value)} – ${formatDate(filter.valueTo)}`;
    }
    if (filter.operator === "before") {
      return `${label} before ${formatDate(filter.value)}`;
    }
    return `${label} after ${formatDate(filter.value)}`;
  }

  return label;
};
