import type { InventoryItem, MetalType } from "@/lib/types";

export type ProductMetalTab = "all" | "gold" | "silver";

const GOLD_METALS: MetalType[] = ["Gold", "Rose Gold"];

export const isActiveUnit = (status: string) => status !== "Sold";

export const matchesProductMetalTab = (
  metal: MetalType,
  tab: ProductMetalTab,
): boolean => {
  if (tab === "all") return true;
  if (tab === "gold") return GOLD_METALS.includes(metal);
  return metal === "Silver";
};

export const getActiveUnitCount = (item: InventoryItem) =>
  item.units.filter((u) => isActiveUnit(u.status)).length;

export const getProductMetalStats = (
  items: InventoryItem[],
  tab: ProductMetalTab,
) => {
  const matched = items.filter((item) => matchesProductMetalTab(item.metal, tab));

  let activeQty = 0;
  let stockValue = 0;

  for (const item of matched) {
    const activeUnits = getActiveUnitCount(item);
    activeQty += activeUnits;
    stockValue += activeUnits * item.price;
  }

  return { activeQty, stockValue, skuCount: matched.length };
};
