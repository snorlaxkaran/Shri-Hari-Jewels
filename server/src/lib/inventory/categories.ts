export const PRODUCT_CATEGORIES = [
  "Earrings",
  "Necklaces",
  "Rings",
  "Bangles",
  "Anklets",
  "Others",
] as const;

export type ProductCategory = (typeof PRODUCT_CATEGORIES)[number];

export const CATEGORY_SKU_PREFIX: Record<ProductCategory, string> = {
  Earrings: "ER",
  Necklaces: "NK",
  Rings: "RG",
  Bangles: "BG",
  Anklets: "AK",
  Others: "OT",
};

export const CATEGORY_COLORS: Record<ProductCategory, string> = {
  Earrings: "#71717a",
  Necklaces: "#52525b",
  Rings: "#a1a1aa",
  Bangles: "#3f3f46",
  Anklets: "#78716c",
  Others: "#d4d4d8",
};

/** Single-letter metal codes embedded in auto-generated SKUs (e.g. RG-G-26-0001). */
export const METAL_SKU_CODE: Record<string, string> = {
  Gold: "G",
  Silver: "S",
  Platinum: "P",
  "Rose Gold": "R",
  "Base Metal": "B",
};
