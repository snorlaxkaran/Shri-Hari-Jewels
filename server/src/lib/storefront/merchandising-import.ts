import { prisma } from "../db.js";
import { InventoryError } from "../inventory/service.js";
import type { BulkUpdateResult } from "../../types.js";

export type StorefrontMerchandisingRow = {
  sku: string;
  collectionName: string;
  sortingNumber: number;
};

const MAX_ROWS = 5000;

const normalizeSku = (value: string) => value.trim().toUpperCase();

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const resolveCollection = async (
  organizationId: string,
  name: string,
): Promise<{ id: string }> => {
  const trimmed = name.trim();
  const existing = await prisma.storefrontCollection.findFirst({
    where: {
      organizationId,
      name: { equals: trimmed, mode: "insensitive" },
    },
  });
  if (existing) return { id: existing.id };

  let slug = slugify(trimmed);
  if (!slug) slug = "collection";

  let suffix = 0;
  let candidate = slug;
  while (
    await prisma.storefrontCollection.findFirst({
      where: { organizationId, slug: candidate },
    })
  ) {
    suffix += 1;
    candidate = `${slug}-${suffix}`;
  }

  const created = await prisma.storefrontCollection.create({
    data: {
      organizationId,
      name: trimmed,
      slug: candidate,
      active: true,
    },
  });
  return { id: created.id };
};

export const importStorefrontMerchandising = async (
  rows: StorefrontMerchandisingRow[],
  organizationId: string,
): Promise<BulkUpdateResult> => {
  if (rows.length === 0) {
    throw new InventoryError("No rows to import.", 400);
  }
  if (rows.length > MAX_ROWS) {
    throw new InventoryError(
      `Too many rows (${rows.length}). Split into files of ${MAX_ROWS} rows or fewer.`,
      400,
    );
  }

  const skus = [...new Set(rows.map((row) => normalizeSku(row.sku)))];
  const products = await prisma.product.findMany({
    where: { organizationId, sku: { in: skus } },
    select: { id: true, sku: true },
  });
  const productBySku = new Map(products.map((p) => [p.sku, p]));

  let updated = 0;
  let unchanged = 0;
  const errors: string[] = [];

  for (const row of rows) {
    const sku = normalizeSku(row.sku);
    const label = `SKU ${sku}`;

    if (!sku) {
      errors.push("Row skipped: empty SKU.");
      continue;
    }
    if (!row.collectionName?.trim()) {
      errors.push(`${label}: collection name is required.`);
      continue;
    }
    if (!Number.isFinite(row.sortingNumber)) {
      errors.push(`${label}: sorting number must be a number.`);
      continue;
    }

    const product = productBySku.get(sku);
    if (!product) {
      errors.push(`${label}: not found in inventory.`);
      continue;
    }

    const sortOrder = Math.round(row.sortingNumber);
    const collection = await resolveCollection(organizationId, row.collectionName);

    const existingLink = await prisma.storefrontCollectionProduct.findUnique({
      where: {
        collectionId_productId: {
          collectionId: collection.id,
          productId: product.id,
        },
      },
    });

    const existingProduct = await prisma.product.findUnique({
      where: { id: product.id },
      select: { storefrontDisplaySort: true },
    });

    const needsLinkUpdate =
      !existingLink || existingLink.sortOrder !== sortOrder;
    const needsSortUpdate =
      existingProduct?.storefrontDisplaySort !== sortOrder;

    if (!needsLinkUpdate && !needsSortUpdate) {
      unchanged += 1;
      continue;
    }

    await prisma.$transaction(async (tx) => {
      await tx.storefrontCollectionProduct.upsert({
        where: {
          collectionId_productId: {
            collectionId: collection.id,
            productId: product.id,
          },
        },
        create: {
          collectionId: collection.id,
          productId: product.id,
          sortOrder,
        },
        update: { sortOrder },
      });

      await tx.product.update({
        where: { id: product.id },
        data: { storefrontDisplaySort: sortOrder },
      });
    });

    updated += 1;
  }

  return { updated, unchanged, errors };
};
