import { prisma } from "../db.js";
import {
  MAX_PRODUCT_IMAGES,
  parseSkuImageFilename,
} from "./product-image-limits.js";
import { InventoryError } from "./service.js";
import type { BulkUpdateResult } from "../../types.js";

export type BulkProductImageInput = {
  sku: string;
  index: number;
  url: string;
  name: string;
};

export type BulkProductImageMode = "replace" | "merge";

const MAX_IMAGES_PER_REQUEST = 40;

const normalizeSku = (value: string) => value.trim().toUpperCase();

export const bulkImportProductImages = async (
  organizationId: string,
  inputs: BulkProductImageInput[],
  mode: BulkProductImageMode,
): Promise<BulkUpdateResult> => {
  if (inputs.length === 0) {
    throw new InventoryError("No images to import.", 400);
  }
  if (inputs.length > MAX_IMAGES_PER_REQUEST) {
    throw new InventoryError(
      `Too many images in one request (${inputs.length}). Send up to ${MAX_IMAGES_PER_REQUEST} per batch.`,
      400,
    );
  }

  const grouped = new Map<string, Map<number, BulkProductImageInput>>();
  const errors: string[] = [];

  for (const input of inputs) {
    const sku = normalizeSku(input.sku);
    const index = input.index;
    if (!sku) {
      errors.push("Empty SKU in upload batch.");
      continue;
    }
    if (index < 1 || index > MAX_PRODUCT_IMAGES) {
      errors.push(`${sku}: image index must be 1–${MAX_PRODUCT_IMAGES}.`);
      continue;
    }
    if (!input.url?.trim()) {
      errors.push(`${sku}_${index}: missing image data.`);
      continue;
    }

    if (input.name) {
      const parsed = parseSkuImageFilename(input.name);
      if (parsed && parsed.sku !== sku) {
        errors.push(`${input.name}: filename SKU does not match payload.`);
        continue;
      }
    }

    if (!grouped.has(sku)) grouped.set(sku, new Map());
    const byIndex = grouped.get(sku)!;
    if (byIndex.has(index)) {
      errors.push(`${sku}_${index}: duplicate index in batch.`);
      continue;
    }
    byIndex.set(index, {
      sku,
      index,
      url: input.url.trim(),
      name: input.name?.trim() || `${sku}_${index}.jpg`,
    });
  }

  const skus = [...grouped.keys()];
  const products = await prisma.product.findMany({
    where: { organizationId, sku: { in: skus } },
    select: { id: true, sku: true },
  });
  const productBySku = new Map(products.map((p) => [p.sku, p]));

  let updated = 0;

  for (const [sku, byIndex] of grouped) {
    const product = productBySku.get(sku);
    if (!product) {
      errors.push(`SKU ${sku}: not found in inventory.`);
      continue;
    }

    try {
      const incoming = [...byIndex.values()].sort((a, b) => a.index - b.index);

      await prisma.$transaction(async (tx) => {
        const merged = new Map<number, { url: string; name: string }>();

        if (mode === "merge") {
          const existing = await tx.productImage.findMany({
            where: { productId: product.id },
            orderBy: { sortOrder: "asc" },
          });
          for (const img of existing) {
            merged.set(img.sortOrder + 1, { url: img.url, name: img.name });
          }
        }

        for (const item of incoming) {
          merged.set(item.index, { url: item.url, name: item.name });
        }

        const indices = [...merged.keys()].sort((a, b) => a - b);
        if (indices.length > MAX_PRODUCT_IMAGES) {
          throw new InventoryError(
            `${sku}: would exceed ${MAX_PRODUCT_IMAGES} images (has ${indices.length}).`,
            400,
          );
        }

        await tx.productImage.deleteMany({ where: { productId: product.id } });
        if (indices.length > 0) {
          await tx.productImage.createMany({
            data: indices.map((index) => ({
              productId: product.id,
              url: merged.get(index)!.url,
              name: merged.get(index)!.name,
              sortOrder: index - 1,
            })),
          });
        }
      });

      updated += 1;
    } catch (err) {
      if (err instanceof InventoryError) {
        errors.push(err.message);
      } else {
        throw err;
      }
    }
  }

  return { updated, unchanged: 0, errors, productsCreated: 0 };
};
