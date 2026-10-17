import { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { StorefrontError } from "./resolve-tenant.js";

const WEIGHT_TOLERANCE = 0.01;
const PRICE_TOLERANCE = 0.01;

export type ListingImportRowInput = {
  stockId?: string;
  sku: string;
  productName?: string;
  weight?: number | string;
  price?: number | string;
  sellingPrice?: number | string;
  desc?: string;
  composition?: string;
  seoUrlKey?: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDesc?: string;
  sortingNo?: string;
  hsn?: string;
};

export type ListingImportRowResult = {
  sku: string;
  status: "updated" | "skipped" | "error";
  published: boolean;
  message?: string;
};

export type ListingImportResult = {
  updated: number;
  published: number;
  skipped: number;
  errors: ListingImportRowResult[];
  rows: ListingImportRowResult[];
};

const parseNum = (value: number | string | undefined): number | null => {
  if (value === undefined || value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replace(/,/g, "").trim());
  return Number.isFinite(n) ? n : null;
};

const normalizeSortKey = (value: string | undefined): string | null => {
  if (!value?.trim()) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return null;
  return digits;
};

const productHasListingImage = async (productId: string): Promise<boolean> => {
  const count = await prisma.productImage.count({ where: { productId } });
  return count >= 1;
};

export const importProductListingRows = async (
  organizationId: string,
  rows: ListingImportRowInput[],
): Promise<ListingImportResult> => {
  const results: ListingImportRowResult[] = [];
  let updated = 0;
  let published = 0;
  let skipped = 0;

  for (const row of rows) {
    const sku = row.sku?.trim();
    if (!sku) {
      skipped += 1;
      results.push({ sku: "", status: "skipped", published: false, message: "Missing SKU." });
      continue;
    }

    const product = await prisma.product.findFirst({
      where: { organizationId, sku: { equals: sku, mode: "insensitive" } },
      include: { images: true },
    });

    if (!product) {
      results.push({
        sku,
        status: "error",
        published: false,
        message: "SKU not found in central catalogue.",
      });
      continue;
    }

    const sheetWeight = parseNum(row.weight);
    const sheetPrice = parseNum(row.price);
    const centralWeight = product.weightGrams;
    const centralPrice = Number(product.price);

    if (sheetWeight !== null && Math.abs(sheetWeight - centralWeight) > WEIGHT_TOLERANCE) {
      results.push({
        sku,
        status: "error",
        published: false,
        message: `Weight mismatch: sheet ${sheetWeight} g vs central ${centralWeight} g.`,
      });
      continue;
    }

    if (sheetPrice !== null && Math.abs(sheetPrice - centralPrice) > PRICE_TOLERANCE) {
      results.push({
        sku,
        status: "error",
        published: false,
        message: `Price mismatch: sheet ${sheetPrice} vs central ${centralPrice}.`,
      });
      continue;
    }

    const sellingPrice = parseNum(row.sellingPrice);
    const sortKey = normalizeSortKey(row.sortingNo);

    const data: Prisma.ProductUpdateInput = {
      ...(row.productName?.trim() && { name: row.productName.trim() }),
      ...(row.desc !== undefined && { storefrontDescription: row.desc?.trim() || null }),
      ...(row.composition !== undefined && {
        storefrontComposition: row.composition?.trim() || null,
      }),
      ...(row.seoUrlKey !== undefined && {
        storefrontSeoUrlKey: row.seoUrlKey?.trim() || null,
      }),
      ...(row.metaTitle !== undefined && { storefrontMetaTitle: row.metaTitle?.trim() || null }),
      ...(row.metaKeyword !== undefined && {
        storefrontMetaKeywords: row.metaKeyword?.trim() || null,
      }),
      ...(row.metaDesc !== undefined && {
        storefrontMetaDescription: row.metaDesc?.trim() || null,
      }),
      ...(sortKey && { storefrontSortKey: sortKey }),
      ...(row.hsn?.trim() && { hsnCode: row.hsn.trim() }),
      ...(sellingPrice !== null && {
        storefrontSellingPrice: sellingPrice,
      }),
    };

    await prisma.product.update({
      where: { id: product.id },
      data,
    });

    const hasImage = product.images.length > 0 || (await productHasListingImage(product.id));
    let didPublish = false;
    if (hasImage) {
      await prisma.product.update({
        where: { id: product.id },
        data: { publishedToStorefront: true },
      });
      didPublish = true;
      published += 1;
    }

    updated += 1;
    results.push({
      sku,
      status: "updated",
      published: didPublish,
      message: didPublish
        ? "Listing saved and product is live on the website."
        : "Listing saved. Add at least 1 photo (SKU_1 … SKU_8) to publish.",
    });
  }

  const errors = results.filter((r) => r.status === "error");
  return { updated, published, skipped, errors, rows: results };
};

export type BulkListingImageInput = {
  sku: string;
  slot: number;
  url: string;
  name: string;
};

export const applyBulkListingImages = async (
  organizationId: string,
  images: BulkListingImageInput[],
): Promise<{ applied: number; errors: string[] }> => {
  const errors: string[] = [];
  let applied = 0;

  const bySku = new Map<string, BulkListingImageInput[]>();
  for (const img of images) {
    const sku = img.sku.trim();
    if (!sku) continue;
    if (img.slot < 1 || img.slot > 8) {
      errors.push(`Invalid image slot for ${sku}: ${img.slot}`);
      continue;
    }
    const list = bySku.get(sku.toLocaleLowerCase()) ?? [];
    if (list.some((x) => x.slot === img.slot)) {
      errors.push(`Duplicate ${sku}_${img.slot}`);
      continue;
    }
    list.push(img);
    bySku.set(sku.toLocaleLowerCase(), list);
  }

  for (const [skuKey, slots] of bySku) {
    if (slots.length > 8) {
      errors.push(`More than 8 images for SKU ${slots[0].sku}`);
      continue;
    }

    const product = await prisma.product.findFirst({
      where: { organizationId, sku: { equals: skuKey, mode: "insensitive" } },
      include: { images: { orderBy: { sortOrder: "asc" } } },
    });
    if (!product) {
      errors.push(`SKU not found: ${slots[0].sku}`);
      continue;
    }

    const sorted = [...slots].sort((a, b) => a.slot - b.slot);
    const imageRows = sorted.map((img, index) => ({
      productId: product.id,
      url: img.url,
      name: img.name || `${product.sku}_${img.slot}`,
      sortOrder: index,
    }));

    await prisma.$transaction([
      prisma.productImage.deleteMany({ where: { productId: product.id } }),
      prisma.productImage.createMany({ data: imageRows }),
    ]);

    applied += sorted.length;

    const listingComplete = await prisma.product.findUnique({
      where: { id: product.id },
      select: { storefrontDescription: true, storefrontMetaTitle: true },
    });
    const hasListingData =
      Boolean(listingComplete?.storefrontDescription) ||
      Boolean(listingComplete?.storefrontMetaTitle);

    if (hasListingData) {
      await prisma.product.update({
        where: { id: product.id },
        data: { publishedToStorefront: true },
      });
    }
  }

  return { applied, errors };
};

export const assertCanPublishProduct = async (
  organizationId: string,
  productId: string,
): Promise<void> => {
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
    include: { images: true },
  });
  if (!product) throw new StorefrontError("Product not found.", 404);
  if (product.images.length < 1) {
    throw new StorefrontError(
      "Add at least 1 product photo (SKU_1) before enabling on the website.",
      400,
    );
  }
};
