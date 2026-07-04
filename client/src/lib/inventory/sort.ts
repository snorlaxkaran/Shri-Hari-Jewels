import { getAgeInDays } from "./ageing";
import type { InventoryUnitRow } from "./unit-rows";

export type InventorySortField =
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
  | "createdAt"
  | "ageing";

export type InventorySortOrder = "asc" | "desc";

export const sortInventoryUnitRows = (
  rows: InventoryUnitRow[],
  sortBy: InventorySortField,
  sortOrder: InventorySortOrder,
): InventoryUnitRow[] => {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...rows].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "itemCode":
        comparison = a.itemCode.localeCompare(b.itemCode, "en-IN");
        break;
      case "sku":
        comparison = a.sku.localeCompare(b.sku, "en-IN");
        break;
      case "name":
        comparison = a.name.localeCompare(b.name, "en-IN");
        break;
      case "category":
        comparison = a.category.localeCompare(b.category, "en-IN");
        break;
      case "metal":
        comparison = a.metal.localeCompare(b.metal, "en-IN");
        break;
      case "purity":
        comparison = a.purity.localeCompare(b.purity, "en-IN");
        break;
      case "weightGrams":
        comparison = a.weightGrams - b.weightGrams;
        break;
      case "price":
        comparison = a.price - b.price;
        break;
      case "status":
        comparison = a.status.localeCompare(b.status, "en-IN");
        break;
      case "branchName":
        comparison = (a.branchName ?? "").localeCompare(
          b.branchName ?? "",
          "en-IN",
        );
        break;
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "ageing":
        comparison = getAgeInDays(a.createdAt) - getAgeInDays(b.createdAt);
        break;
    }

    if (comparison === 0) {
      return a.itemCode.localeCompare(b.itemCode, "en-IN") * direction;
    }

    return comparison * direction;
  });
};

export const toggleSort = (
  currentField: InventorySortField,
  currentOrder: InventorySortOrder,
  nextField: InventorySortField,
): { sortBy: InventorySortField; sortOrder: InventorySortOrder } => {
  if (currentField === nextField) {
    return {
      sortBy: nextField,
      sortOrder: currentOrder === "asc" ? "desc" : "asc",
    };
  }

  const defaultOrder: InventorySortOrder =
    nextField === "createdAt" || nextField === "ageing" ? "desc" : "asc";

  return { sortBy: nextField, sortOrder: defaultOrder };
};
