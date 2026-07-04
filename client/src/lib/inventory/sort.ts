import { getAgeInDays } from "./ageing";
import type { InventoryItem } from "@/lib/types";

export type InventorySortField =
  | "createdAt"
  | "weightGrams"
  | "price"
  | "category"
  | "ageing";

export type InventorySortOrder = "asc" | "desc";

export const sortInventoryItems = (
  items: InventoryItem[],
  sortBy: InventorySortField,
  sortOrder: InventorySortOrder,
): InventoryItem[] => {
  const direction = sortOrder === "asc" ? 1 : -1;

  return [...items].sort((a, b) => {
    let comparison = 0;

    switch (sortBy) {
      case "createdAt":
        comparison =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        break;
      case "ageing":
        comparison = getAgeInDays(a.createdAt) - getAgeInDays(b.createdAt);
        break;
      case "weightGrams":
        comparison = a.weightGrams - b.weightGrams;
        break;
      case "price":
        comparison = a.price - b.price;
        break;
      case "category":
        comparison = a.category.localeCompare(b.category, "en-IN");
        break;
    }

    if (comparison === 0) {
      return a.name.localeCompare(b.name, "en-IN") * direction;
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
