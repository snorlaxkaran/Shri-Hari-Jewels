import * as XLSX from "xlsx";
import type { PublishableProduct, StorefrontCollection } from "./types";

export const PRODUCT_LISTING_HEADERS = [
  "Design No. (SKU)",
  "Product name",
  "Meta title",
  "Meta keywords",
  "Meta description",
  "Dimensions",
  "Weight (g)",
  "Price",
  "International price",
  "Collection name",
] as const;

export const parseListingSkus = (input: string): string[] => {
  const seen = new Set<string>();
  return input
    .split(/[\n,;]+/)
    .map((sku) => sku.trim())
    .filter((sku) => {
      if (!sku) return false;
      const key = sku.toLocaleLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
};

export type ListingWorkbookResult = {
  skuCount: number;
  matchedCount: number;
  unmatchedSkus: string[];
};

export const buildProductListingWorkbook = (
  skus: string[],
  products: PublishableProduct[],
  collections: StorefrontCollection[],
): { workbook: XLSX.WorkBook; result: ListingWorkbookResult } => {
  const productBySku = new Map(
    products.map((product) => [product.sku.trim().toLocaleLowerCase(), product]),
  );
  const matched = skus.map((sku) => productBySku.get(sku.toLocaleLowerCase()));
  const productRows = skus.map((sku, index) => {
    const product = matched[index];
    return [
      sku,
      product?.name ?? "",
      "",
      "",
      "",
      "",
      product?.weightGrams ?? "",
      product?.price ?? "",
      "",
      "",
    ];
  });

  const workbook = XLSX.utils.book_new();
  const productSheet = XLSX.utils.aoa_to_sheet([
    [...PRODUCT_LISTING_HEADERS],
    ...productRows,
  ]);
  productSheet["!cols"] = [
    { wch: 23 },
    { wch: 32 },
    { wch: 32 },
    { wch: 34 },
    { wch: 42 },
    { wch: 24 },
    { wch: 15 },
    { wch: 16 },
    { wch: 21 },
    { wch: 24 },
  ];
  if (productSheet["!ref"]) productSheet["!autofilter"] = { ref: productSheet["!ref"] };
  XLSX.utils.book_append_sheet(workbook, productSheet, "Product Listings");

  const collectionRows = collections.length
    ? collections.map((collection) => [collection.name, collection.slug, collection.productCount])
    : [["No collections yet", "Create collections in Online Store → Collections", ""]];
  const collectionSheet = XLSX.utils.aoa_to_sheet([
    ["Collection name", "Website URL slug", "Products currently assigned"],
    ...collectionRows,
  ]);
  collectionSheet["!cols"] = [{ wch: 30 }, { wch: 36 }, { wch: 32 }];
  XLSX.utils.book_append_sheet(workbook, collectionSheet, "Collections");

  const instructionSheet = XLSX.utils.aoa_to_sheet([
    ["Product listing workbook", "Instructions"],
    ["1. Product Listings", "Complete the SEO, dimensions, international price, and collection name columns. Existing product name, weight, and price are prefilled when the SKU is found in central stock."],
    ["2. Design No. (SKU)", "This is the exact SKU you entered. Only the SKUs supplied for this workbook are included; other central-stock products are not added or published."],
    ["3. Collection name", "Use an exact collection name from the Collections sheet. Create collections in Online Store → Collections before using a new collection."],
    ["4. Missing SKU matches", "If a SKU is not in this company’s central stock, it is still included with blank product details so you can identify and correct it."],
    ["5. Publishing", "This workbook is a listing-preparation template only. Downloading it does not publish or change any products."],
  ]);
  instructionSheet["!cols"] = [{ wch: 28 }, { wch: 110 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

  const unmatchedSkus = skus.filter((_, index) => !matched[index]);
  return {
    workbook,
    result: {
      skuCount: skus.length,
      matchedCount: skus.length - unmatchedSkus.length,
      unmatchedSkus,
    },
  };
};

export const downloadProductListingWorkbook = (
  skus: string[],
  products: PublishableProduct[],
  collections: StorefrontCollection[],
): ListingWorkbookResult => {
  const { workbook, result } = buildProductListingWorkbook(skus, products, collections);
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `product-listing-${date}.xlsx`);
  return result;
};
