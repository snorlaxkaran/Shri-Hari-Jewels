import type { StockAuditMetalGroup } from "../../types.js";

const GOLD_METALS = new Set(["Gold", "Rose Gold"]);

export const STOCK_AUDIT_METAL_GROUPS: StockAuditMetalGroup[] = [
  "Gold",
  "Silver",
  "Alloy",
];

export const stockAuditMetalLabel = (group: StockAuditMetalGroup): string => {
  if (group === "Alloy") return "Alloy";
  return group;
};

export const productMetalMatchesAuditGroup = (
  productMetal: string,
  group: StockAuditMetalGroup,
): boolean => {
  if (group === "Gold") return GOLD_METALS.has(productMetal);
  if (group === "Silver") return productMetal === "Silver";
  return productMetal === "Base Metal";
};

export const prismaMetalFilterForAuditGroup = (
  group: StockAuditMetalGroup,
): { in: string[] } | string => {
  if (group === "Gold") return { in: ["Gold", "Rose Gold"] };
  if (group === "Silver") return "Silver";
  return "Base Metal";
};

export const parseStockAuditMetalGroup = (
  value: string,
): StockAuditMetalGroup | null => {
  const normalized = value.trim();
  if (normalized === "Gold" || normalized === "gold") return "Gold";
  if (normalized === "Silver" || normalized === "silver") return "Silver";
  if (normalized === "Alloy" || normalized === "alloy") return "Alloy";
  return null;
};
