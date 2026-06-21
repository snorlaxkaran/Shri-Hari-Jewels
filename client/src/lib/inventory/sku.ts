import type { ProductCategory } from "./categories";
import { CATEGORY_SKU_PREFIX } from "./categories";

/** Matches SKUs like ER-26-0001 */
const SKU_PATTERN = /^([A-Z]{2})-(\d{2})-(\d{4})$/;

/** Matches unit codes like ER-26-0001-003 */
const UNIT_CODE_PATTERN = /^([A-Z]{2}-\d{2}-\d{4})-(\d{3})$/;

export const getCurrentYearSuffix = (date = new Date()) =>
  String(date.getFullYear()).slice(-2);

/**
 * Build a SKU: {PREFIX}-{YY}-{SEQ}
 * Example: ER-26-0001
 */
export const formatSku = (
  category: ProductCategory,
  sequence: number,
  yearSuffix = getCurrentYearSuffix(),
) => {
  const prefix = CATEGORY_SKU_PREFIX[category];
  return `${prefix}-${yearSuffix}-${String(sequence).padStart(4, "0")}`;
};

/**
 * Build a unit item code under a SKU: {SKU}-{UNIT}
 * Example: ER-26-0001-003
 */
export const formatUnitCode = (sku: string, unitNumber: number) =>
  `${sku}-${String(unitNumber).padStart(3, "0")}`;

export const parseSku = (sku: string) => {
  const match = sku.match(SKU_PATTERN);
  if (!match) return null;
  return {
    prefix: match[1],
    yearSuffix: match[2],
    sequence: parseInt(match[3], 10),
  };
};

/** Next sequence number for a category in the current year */
export const getNextSkuSequence = (
  existingSkus: string[],
  category: ProductCategory,
  yearSuffix = getCurrentYearSuffix(),
): number => {
  const prefix = CATEGORY_SKU_PREFIX[category];
  let max = 0;

  for (const sku of existingSkus) {
    const parsed = parseSku(sku);
    if (
      parsed &&
      parsed.prefix === prefix &&
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
) => {
  const yearSuffix = getCurrentYearSuffix();
  const sequence = getNextSkuSequence(existingSkus, category, yearSuffix);
  return formatSku(category, sequence, yearSuffix);
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
