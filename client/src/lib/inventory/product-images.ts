import type { InventoryItem, ProductImage } from "@/lib/types";

/** Cover photo for a SKU — shared by Product tab and Central Stock. */
export const getProductCoverImageUrl = (
  images: ProductImage[] | undefined,
): string | undefined => {
  if (!images?.length) return undefined;
  const url = images[0]?.url?.trim();
  return url || undefined;
};

export const getProductCoverFromItem = (
  product: Pick<InventoryItem, "images">,
): string | undefined => getProductCoverImageUrl(product.images);
