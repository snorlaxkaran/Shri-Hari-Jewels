import type { InventoryUnitRow } from "@/lib/inventory/unit-rows";

export type HallmarkFilter = "" | "pending" | "done" | "exempt";

const HALLMARK_METALS = new Set(["Gold", "Rose Gold", "Platinum"]);
const MIN_HALLMARK_WEIGHT_GRAMS = 2;

export const requiresHallmark = (row: InventoryUnitRow): boolean =>
  HALLMARK_METALS.has(row.metal) && row.weightGrams >= MIN_HALLMARK_WEIGHT_GRAMS;

export const isHallmarkedUnit = (row: InventoryUnitRow): boolean =>
  Boolean(row.huid?.trim() || row.hallmarkNumber?.trim());

export const matchesHallmarkFilter = (
  row: InventoryUnitRow,
  filter: HallmarkFilter,
): boolean => {
  if (!filter) return true;
  if (filter === "pending") return requiresHallmark(row) && !isHallmarkedUnit(row);
  if (filter === "done") return isHallmarkedUnit(row);
  return !requiresHallmark(row);
};
