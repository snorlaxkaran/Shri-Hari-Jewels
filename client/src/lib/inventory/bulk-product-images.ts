import { api } from "@/lib/api/client";
import {
  MAX_PRODUCT_IMAGES,
  parseSkuImageFilename,
  processImageFile,
} from "@/lib/inventory/images";
import type { BulkUpdateResult } from "@/lib/types";

export type BulkProductImagePayload = {
  sku: string;
  index: number;
  url: string;
  name: string;
};

const BATCH_SIZE = 8;

export const uploadBulkProductImages = async (
  files: File[],
  mode: "replace" | "merge",
  onProgress?: (done: number, total: number) => void,
): Promise<BulkUpdateResult> => {
  const parsed: { file: File; sku: string; index: number }[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const match = parseSkuImageFilename(file.name);
    if (!match) {
      errors.push(
        `${file.name}: name must look like SKU0001_1.jpg (index 1–${MAX_PRODUCT_IMAGES}).`,
      );
      continue;
    }
    parsed.push({ file, sku: match.sku, index: match.index });
  }

  if (parsed.length === 0) {
    return { updated: 0, unchanged: 0, productsCreated: 0, errors };
  }

  const payloads: BulkProductImagePayload[] = [];
  for (const item of parsed) {
    try {
      const url = await processImageFile(item.file);
      payloads.push({
        sku: item.sku,
        index: item.index,
        url,
        name: item.file.name,
      });
    } catch (err) {
      errors.push(
        `${item.file.name}: ${err instanceof Error ? err.message : "Could not process image."}`,
      );
    }
  }

  let updated = 0;
  let unchanged = 0;

  for (let i = 0; i < payloads.length; i += BATCH_SIZE) {
    const batch = payloads.slice(i, i + BATCH_SIZE);
    const { data } = await api.post<BulkUpdateResult>(
      "/api/inventory/bulk/product-images",
      { images: batch, mode },
      { timeout: 120000 },
    );
    updated += data.updated;
    unchanged += data.unchanged;
    errors.push(...data.errors);
    onProgress?.(Math.min(i + batch.length, payloads.length), payloads.length);
  }

  return { updated, unchanged, productsCreated: 0, errors };
};
