import type { MetalType } from "@/lib/types";
import type { ProductCategory } from "./categories";
import { CATEGORY_SKU_PREFIX, METAL_SKU_CODE } from "./categories";

/** New format: RG-G-26-0001 */
const SKU_PATTERN = /^([A-Z]{2})-([A-Z])-(\d{2})-(\d{4})$/;
/** Legacy format: ER-26-0001 */
const LEGACY_SKU_PATTERN = /^([A-Z]{2})-(\d{2})-(\d{4})$/;

export const getCurrentYearSuffix = (date = new Date()) =>
  String(date.getFullYear()).slice(-2);

/**
 * Build a SKU: {CATEGORY}-{METAL}-{YY}-{SEQ}
 * Example: RG-G-26-0001
 */
export const formatSku = (
  category: ProductCategory,
  metal: MetalType | string,
  sequence: number,
  yearSuffix = getCurrentYearSuffix(),
) => {
  const prefix = CATEGORY_SKU_PREFIX[category];
  const metalCode = METAL_SKU_CODE[metal] ?? "X";
  return `${prefix}-${metalCode}-${yearSuffix}-${String(sequence).padStart(4, "0")}`;
};

/**
 * Build a unit item code under a SKU: {SKU}-{UNIT}
 * Example: RG-G-26-0001-003
 */
export const formatUnitCode = (sku: string, unitNumber: number) =>
  `${sku}-${String(unitNumber).padStart(3, "0")}`;

export const parseSku = (sku: string) => {
  const match = sku.match(SKU_PATTERN);
  if (match) {
    return {
      categoryPrefix: match[1],
      metalCode: match[2],
      yearSuffix: match[3],
      sequence: parseInt(match[4], 10),
    };
  }

  const legacyMatch = sku.match(LEGACY_SKU_PATTERN);
  if (legacyMatch) {
    return {
      categoryPrefix: legacyMatch[1],
      metalCode: undefined,
      yearSuffix: legacyMatch[2],
      sequence: parseInt(legacyMatch[3], 10),
    };
  }

  return null;
};

/** Next sequence number for a category + metal in the current year */
export const getNextSkuSequence = (
  existingSkus: string[],
  category: ProductCategory,
  metal: MetalType | string,
  yearSuffix = getCurrentYearSuffix(),
): number => {
  const prefix = CATEGORY_SKU_PREFIX[category];
  const metalCode = METAL_SKU_CODE[metal] ?? "X";
  let max = 0;

  for (const sku of existingSkus) {
    const parsed = parseSku(sku);
    if (
      parsed &&
      parsed.categoryPrefix === prefix &&
      parsed.metalCode === metalCode &&
      parsed.yearSuffix === yearSuffix
    ) {
      max = Math.max(max, parsed.sequence);
    }
  }

  return max + 1;
};

export const generateSku = (
  existingSkus: string[],
  category: ProductCategory,
  metal: MetalType | string,
) => {
  const yearSuffix = getCurrentYearSuffix();
  const sequence = getNextSkuSequence(
    existingSkus,
    category,
    metal,
    yearSuffix,
  );
  return formatSku(category, metal, sequence, yearSuffix);
};

/** Next unit number for a given SKU across all existing unit codes */
export const getNextUnitNumber = (
  existingUnitCodes: string[],
  sku: string,
): number => {
  let max = 0;
  const prefix = `${sku}-`;

  for (const code of existingUnitCodes) {
    if (!code.startsWith(prefix)) continue;
    const suffix = code.slice(prefix.length);
    const num = parseInt(suffix, 10);
    if (!Number.isNaN(num) && suffix === String(num).padStart(3, "0")) {
      max = Math.max(max, num);
    }
  }

  return max + 1;
};

export const generateUnitCodes = (
  sku: string,
  quantity: number,
  existingUnitCodes: string[],
): string[] => {
  let next = getNextUnitNumber(existingUnitCodes, sku);
  const codes: string[] = [];
  for (let i = 0; i < quantity; i++) {
    codes.push(formatUnitCode(sku, next));
    next++;
  }
  return codes;
};
