import * as XLSX from "xlsx";
import type { PublishableProduct } from "./types";

export const PRODUCT_LISTING_HEADERS = [
  "STOCK ID",
  "SKU",
  "PRODUCT NAME",
  "WEIGHT",
  "PRICE",
  "SELLING PRICE",
  "DESC",
  "COMPOSITION",
  "SEO URL KEY",
  "META TITLE",
  "META KEYWORD",
  "META DESC",
  "SORTING NO",
  "HSN",
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

/** Active in central = has available stock and not marked out of stock. */
export const isListingActiveProduct = (product: PublishableProduct): boolean =>
  product.stock > 0 && product.status !== "Out of Stock";

export type ListingWorkbookResult = {
  requestedCount: number;
  exportedCount: number;
  omittedSkus: string[];
};

export const buildProductListingWorkbook = (
  skus: string[],
  products: PublishableProduct[],
): { workbook: XLSX.WorkBook; result: ListingWorkbookResult } => {
  const productBySku = new Map(
    products.map((product) => [product.sku.trim().toLocaleLowerCase(), product]),
  );

  const omittedSkus: string[] = [];
  const activeRows: PublishableProduct[] = [];

  for (const sku of skus) {
    const product = productBySku.get(sku.toLocaleLowerCase());
    if (!product || !isListingActiveProduct(product)) {
      omittedSkus.push(sku);
      continue;
    }
    activeRows.push(product);
  }

  const emptyFields = PRODUCT_LISTING_HEADERS.length - 2;
  const productRows = activeRows.map((product) => [
    product.stockItemCode ?? product.id,
    product.sku,
    ...Array.from({ length: emptyFields }, () => ""),
  ]);

  const workbook = XLSX.utils.book_new();
  const productSheet = XLSX.utils.aoa_to_sheet([
    [...PRODUCT_LISTING_HEADERS],
    ...productRows,
  ]);
  productSheet["!cols"] = PRODUCT_LISTING_HEADERS.map(() => ({ wch: 18 }));
  if (productSheet["!ref"]) productSheet["!autofilter"] = { ref: productSheet["!ref"] };
  XLSX.utils.book_append_sheet(workbook, productSheet, "Listings");

  const instructionSheet = XLSX.utils.aoa_to_sheet([
    ["Website listing workbook", "Instructions"],
    ["Download", "Only STOCK ID and SKU are prefilled for active central-stock items. Fill SEO, selling price, etc. as needed."],
    ["WEIGHT & PRICE", "Leave blank to use central ERP values. If you enter values, they must match central stock."],
    ["SELLING PRICE", "Website price shown to customers. Can differ from central PRICE."],
    ["SORTING NO", "Optional YYYYMMDD. Newest sort keys appear first on the shop."],
    ["Upload Excel", "Saves listing fields on the server only — products do NOT go live automatically."],
    ["Photos", "Upload website catalogue images (SKU_1 … SKU_8) anytime. At least 1 required before manual publish."],
    ["Go live", "After upload, review each SKU in the table below and turn Published on manually."],
  ]);
  instructionSheet["!cols"] = [{ wch: 28 }, { wch: 90 }];
  XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

  return {
    workbook,
    result: {
      requestedCount: skus.length,
      exportedCount: activeRows.length,
      omittedSkus,
    },
  };
};

export const downloadProductListingWorkbook = (
  skus: string[],
  products: PublishableProduct[],
): ListingWorkbookResult => {
  const { workbook, result } = buildProductListingWorkbook(skus, products);
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `website-listing-${date}.xlsx`);
  return result;
};

const headerAliases: Record<string, keyof ParsedListingRow> = {
  "stock id": "stockId",
  sku: "sku",
  "product name": "productName",
  weight: "weight",
  price: "price",
  "selling price": "sellingPrice",
  desc: "desc",
  description: "desc",
  composition: "composition",
  "seo url key": "seoUrlKey",
  "meta title": "metaTitle",
  "meta keyword": "metaKeyword",
  "meta keywords": "metaKeyword",
  "meta desc": "metaDesc",
  "meta description": "metaDesc",
  "sorting no": "sortingNo",
  hsn: "hsn",
};

export type ParsedListingRow = {
  stockId?: string;
  sku: string;
  productName?: string;
  weight?: string | number;
  price?: string | number;
  sellingPrice?: string | number;
  desc?: string;
  composition?: string;
  seoUrlKey?: string;
  metaTitle?: string;
  metaKeyword?: string;
  metaDesc?: string;
  sortingNo?: string;
  hsn?: string;
};

const normalizeHeader = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase();

export const parseListingWorkbook = (file: ArrayBuffer): ParsedListingRow[] => {
  const workbook = XLSX.read(file, { type: "array" });
  const sheet = workbook.Sheets.Listings ?? workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) return [];

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
    raw: false,
  });

  if (rows.length === 0) {
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" }) as unknown[][];
    if (matrix.length < 2) return [];
    const headers = (matrix[0] as unknown[]).map(normalizeHeader);
    return matrix.slice(1).flatMap((row) => {
      const record: Partial<ParsedListingRow> = {};
      headers.forEach((header, index) => {
        const key = headerAliases[header];
        if (!key) return;
        record[key] = String((row as unknown[])[index] ?? "").trim();
      });
      const sku = record.sku?.trim();
      if (!sku) return [];
      return [record as ParsedListingRow];
    });
  }

  return rows.flatMap((row) => {
    const mapped: Partial<ParsedListingRow> = {};
    for (const [header, value] of Object.entries(row)) {
      const key = headerAliases[normalizeHeader(header)];
      if (!key) continue;
      mapped[key] = String(value ?? "").trim();
    }
    const sku = mapped.sku?.trim();
    if (!sku) return [];
    return [mapped as ParsedListingRow];
  });
};
