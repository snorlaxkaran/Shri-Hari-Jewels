import type { InventoryUnitRow } from "@/lib/inventory/unit-rows";

export type HallmarkFilter = "" | "pending" | "done" | "exempt";

const HALLMARK_METALS = new Set(["Gold", "Rose Gold", "Platinum"]);
const MIN_HALLMARK_WEIGHT_GRAMS = 2;

export const requiresHallmark = (
  row: Pick<InventoryUnitRow, "metal" | "weightGrams">,
): boolean =>
  HALLMARK_METALS.has(row.metal) && row.weightGrams >= MIN_HALLMARK_WEIGHT_GRAMS;

export const isHallmarkedUnit = (
  row: Pick<InventoryUnitRow, "huid" | "hallmarkNumber">,
): boolean => Boolean(row.huid?.trim() || row.hallmarkNumber?.trim());

export const isHallmarkPending = (
  row: Pick<
    InventoryUnitRow,
    "status" | "metal" | "weightGrams" | "huid" | "hallmarkNumber" | "hallmarkPending"
  >,
): boolean =>
  Boolean(
    row.hallmarkPending ??
      (row.status === "Available" &&
        requiresHallmark(row) &&
        !isHallmarkedUnit(row)),
  );

/** Status shown in inventory — unhallmarked gold is not sellable. */
export const getUnitSaleStatus = (
  row: Pick<
    InventoryUnitRow,
    "status" | "metal" | "weightGrams" | "huid" | "hallmarkNumber" | "hallmarkPending"
  >,
): string => (isHallmarkPending(row) ? "Needs Hallmark" : row.status);

export const matchesHallmarkFilter = (
  row: InventoryUnitRow,
  filter: HallmarkFilter,
): boolean => {
  if (!filter) return true;
  if (filter === "pending") return isHallmarkPending(row);
  if (filter === "done") return isHallmarkedUnit(row);
  return !requiresHallmark(row);
};
