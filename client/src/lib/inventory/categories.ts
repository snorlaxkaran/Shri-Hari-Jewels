export const PRODUCT_CATEGORIES = [
  "Earrings",
  "Necklaces",
  "Rings",
  "Bangles",
  "Others",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_SKU_PREFIX: Record<ProductCategory, string> = {
  Earrings: "ER",
  Necklaces: "NK",
  Rings: "RG",
  Bangles: "BG",
  Others: "OT",
};

export const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Earrings: "#71717a",
  Necklaces: "#52525b",
  Rings: "#a1a1aa",
  Bangles: "#3f3f46",
  Others: "#d4d4d8",
};
