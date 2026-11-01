export const MAX_PRODUCT_IMAGES = 8;
export const TARGET_IMAGE_WIDTH = 1200;
export const TARGET_IMAGE_HEIGHT = 1810;

/** Matches SKU0001_1.jpg, SKU0100_8.webp (SKU = everything before the last _index). */
export const SKU_IMAGE_FILENAME =
  /^(.+)_([1-8])\.(jpe?g|png|webp)$/i;

export const parseSkuImageFilename = (
  filename: string,
): { sku: string; index: number } | null => {
  const base = filename.split(/[/\\]/).pop()?.trim() ?? "";
  const match = base.match(SKU_IMAGE_FILENAME);
  if (!match) return null;
  const sku = match[1].trim().toUpperCase();
  const index = Number(match[2]);
  if (!sku || index < 1 || index > MAX_PRODUCT_IMAGES) return null;
  return { sku, index };
};
