import type { MetalType, Purity } from "../../types.js";

export const DESIGN_METALS: MetalType[] = [
  "Gold",
  "Silver",
  "Platinum",
  "Rose Gold",
];

export const DESIGN_PURITIES: Purity[] = ["24K", "22K", "18K", "14K", "925"];

export const isValidDesignMetal = (metal: string): metal is MetalType =>
  (DESIGN_METALS as readonly string[]).includes(metal);

export const isValidDesignPurity = (purity: string): purity is Purity =>
  (DESIGN_PURITIES as readonly string[]).includes(purity);

const GOLD_PURITIES: Purity[] = ["24K", "22K", "18K", "14K"];

export const isValidMotifPurityForMetal = (
  metal: string,
  purity: string,
): purity is Purity => {
  if (!isValidDesignPurity(purity)) return false;
  if (metal === "Silver") return purity === "925";
  if (metal === "Gold" || metal === "Platinum") {
    return (GOLD_PURITIES as readonly string[]).includes(purity);
  }
  return false;
};
