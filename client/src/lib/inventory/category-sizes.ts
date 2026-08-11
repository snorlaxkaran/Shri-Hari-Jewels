import type { ProductCategory } from "./categories";

/** Indian ring sizes — commonly 4 through 27. */
const RING_SIZES = Array.from({ length: 24 }, (_, index) => String(index + 4));

/** Bangle/bracelet sizes in X|Y inch format — 2|2 through 2|10. */
const BANGLE_SIZES = Array.from({ length: 9 }, (_, index) => `2|${index + 2}`);

export const CATEGORY_SIZES: Partial<Record<ProductCategory, string[]>> = {
  Rings: RING_SIZES,
  Bangles: BANGLE_SIZES,
};

export const categoryHasSizeOptions = (category: ProductCategory): boolean =>
  (CATEGORY_SIZES[category]?.length ?? 0) > 0;
