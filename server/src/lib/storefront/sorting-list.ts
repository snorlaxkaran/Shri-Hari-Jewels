import { prisma } from "../db.js";
import { InventoryError } from "../inventory/service.js";
import type { BulkUpdateResult } from "../../types.js";
import {
  importStorefrontMerchandising,
  type StorefrontMerchandisingRow,
} from "./merchandising-import.js";

export type WebsiteSortingRow = {
  sku: string;
  collectionName: string;
  sortingNumber: number;
};

export const listWebsiteSortingRows = async (
  organizationId: string,
): Promise<WebsiteSortingRow[]> => {
  const products = await prisma.product.findMany({
    where: {
      organizationId,
      publishedToStorefront: true,
    },
    select: {
      sku: true,
      storefrontDisplaySort: true,
      collectionLinks: {
        orderBy: { sortOrder: "desc" },
        take: 1,
        select: {
          collection: { select: { name: true } },
        },
      },
    },
    orderBy: [{ storefrontDisplaySort: "desc" }, { sku: "asc" }],
  });

  return products.map((product) => ({
    sku: product.sku,
    collectionName: product.collectionLinks[0]?.collection.name ?? "",
    sortingNumber: product.storefrontDisplaySort,
  }));
};

export const importWebsiteSortingRows = async (
  rows: WebsiteSortingRow[],
  organizationId: string,
): Promise<BulkUpdateResult> => {
  if (rows.length === 0) {
    throw new InventoryError("No rows to import.", 400);
  }

  const withCollection: StorefrontMerchandisingRow[] = [];
  const sortOnly: WebsiteSortingRow[] = [];

  for (const row of rows) {
    if (row.collectionName?.trim()) {
      withCollection.push({
        sku: row.sku,
        collectionName: row.collectionName.trim(),
        sortingNumber: row.sortingNumber,
      });
    } else {
      sortOnly.push(row);
    }
  }

  let updated = 0;
  let unchanged = 0;
  const errors: string[] = [];

  if (withCollection.length > 0) {
    const merch = await importStorefrontMerchandising(withCollection, organizationId);
    updated += merch.updated;
    unchanged += merch.unchanged;
    errors.push(...merch.errors);
  }

  const normalizeSku = (value: string) => value.trim().toUpperCase();
  const skus = [...new Set(sortOnly.map((row) => normalizeSku(row.sku)))];
  const products = await prisma.product.findMany({
    where: { organizationId, sku: { in: skus }, publishedToStorefront: true },
    select: { id: true, sku: true, storefrontDisplaySort: true },
  });
  const productBySku = new Map(products.map((p) => [normalizeSku(p.sku), p]));

  for (const row of sortOnly) {
    const sku = normalizeSku(row.sku);
    if (!sku) {
      errors.push("Row skipped: empty SKU.");
      continue;
    }
    if (!Number.isFinite(row.sortingNumber)) {
      errors.push(`SKU ${sku}: sorting number must be numeric.`);
      continue;
    }

    const product = productBySku.get(sku);
    if (!product) {
      errors.push(
        `SKU ${sku}: not found among products live on the website (publish first).`,
      );
      continue;
    }

    const sortOrder = Math.round(row.sortingNumber);
    if (product.storefrontDisplaySort === sortOrder) {
      unchanged += 1;
      continue;
    }

    await prisma.product.update({
      where: { id: product.id },
      data: { storefrontDisplaySort: sortOrder },
    });
    updated += 1;
  }

  return { updated, unchanged, errors, productsCreated: 0 };
};
