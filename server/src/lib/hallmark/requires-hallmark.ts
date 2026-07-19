const HALLMARK_METALS = new Set(["Gold", "Rose Gold", "Platinum"]);

const MIN_HALLMARK_WEIGHT_GRAMS = 2;

export const isHallmarked = (unit: {
  huid?: string | null;
  hallmarkNumber?: string | null;
}): boolean =>
  Boolean(unit.huid?.trim() || unit.hallmarkNumber?.trim());

export const requiresHallmark = (product: {
  metal: string;
  weightGrams: number;
}): boolean => {
  if (!HALLMARK_METALS.has(product.metal)) return false;
  return product.weightGrams >= MIN_HALLMARK_WEIGHT_GRAMS;
};

export const HUID_PATTERN = /^[A-Z0-9]{6}$/i;

export const normalizeHuid = (value: string): string => value.trim().toUpperCase();

export const validateHuid = (value: string): string => {
  const huid = normalizeHuid(value);
  if (!HUID_PATTERN.test(huid)) {
    throw new Error("HUID must be exactly 6 alphanumeric characters.");
  }
  return huid;
};
