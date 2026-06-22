import type { LegacyStockImportRow, MetalType, Purity } from "@/lib/types";
import {
  PRODUCT_CATEGORIES,
  type ProductCategory,
} from "@/lib/inventory/categories";

export const STOCK_EXCEL_HEADERS = [
  "Stock Type",
  "HSN",
  "SKU NO",
  "Item no/ Barcode",
  "Status",
  "Item Description",
  "Category",
  "Sub-Category",
  "Collection",
  "Website Status",
  "Vendor Name",
  "Metal",
  "Purity",
  "Wt Gross",
  "Wt Net",
  "Wt Other",
  "Stone Name",
  "Wt Stone",
  "Color Stone",
  "Retail Price",
  "Cost",
  "Active Date",
  "Current Location",
  "Item Remarks",
] as const;

const HEADER_ALIASES: Record<string, keyof typeof COLUMN_MAP> = {
  "stock type": "stockType",
  hsn: "hsn",
  "sku no": "catalogNo",
  "sku no.": "catalogNo",
  "item no/ barcode": "itemCode",
  "item no/barcode": "itemCode",
  status: "status",
  "item description": "name",
  category: "category",
  "sub-category": "subCategory",
  "sub category": "subCategory",
  collection: "collection",
  "website status": "websiteStatus",
  "vendor name": "vendor",
  metal: "metal",
  purity: "purity",
  "wt gross": "wtGross",
  "wt net": "wtNet",
  "wt other": "wtOther",
  "stone name": "stoneName",
  "wt stone": "wtStone",
  "color stone": "colorStone",
  "retail price": "retailPrice",
  cost: "cost",
  "active date": "activeDate",
  "current location": "location",
  "item remarks": "remarks",
};

const COLUMN_MAP = {
  stockType: "Stock Type",
  hsn: "HSN",
  catalogNo: "SKU NO",
  itemCode: "Item no/ Barcode",
  status: "Status",
  name: "Item Description",
  category: "Category",
  subCategory: "Sub-Category",
  collection: "Collection",
  websiteStatus: "Website Status",
  vendor: "Vendor Name",
  metal: "Metal",
  purity: "Purity",
  wtGross: "Wt Gross",
  wtNet: "Wt Net",
  wtOther: "Wt Other",
  stoneName: "Stone Name",
  wtStone: "Wt Stone",
  colorStone: "Color Stone",
  retailPrice: "Retail Price",
  cost: "Cost",
  activeDate: "Active Date",
  location: "Current Location",
  remarks: "Item Remarks",
} as const;

type ParsedRow = {
  stockType?: string;
  hsn?: string;
  catalogNo?: string;
  itemCode?: string;
  status?: string;
  name?: string;
  category?: string;
  subCategory?: string;
  collection?: string;
  websiteStatus?: string;
  vendor?: string;
  metal?: string;
  purity?: string | number;
  wtGross?: number;
  wtNet?: number;
  wtOther?: number;
  stoneName?: string;
  wtStone?: number;
  colorStone?: string;
  retailPrice?: number;
  cost?: number;
  activeDate?: string;
  location?: string;
  remarks?: string;
};

const normalizeHeader = (value: string) => value.trim().toLowerCase();

const cellText = (value: unknown): string => {
  if (value == null) return "";
  return String(value).trim();
};

const cellNumber = (value: unknown): number | undefined => {
  if (value == null || value === "") return undefined;
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const mapLegacyCategory = (value: string): ProductCategory => {
  const key = value.trim().toUpperCase();
  const mapping: Record<string, ProductCategory> = {
    ANKLET: "Anklets",
    ANKLETS: "Anklets",
    EARRING: "Earrings",
    EARRINGS: "Earrings",
    NECKLACE: "Necklaces",
    NECKLACES: "Necklaces",
    RING: "Rings",
    RINGS: "Rings",
    BANGLE: "Bangles",
    BANGLES: "Bangles",
    OTHERS: "Others",
    OTHER: "Others",
  };
  return mapping[key] ?? "Others";
};

const mapLegacyMetal = (value: string, stockType?: string): MetalType => {
  const metal = value.trim();
  const type = stockType?.trim().toLowerCase() ?? "";
  if (!metal) {
    if (type.includes("silver")) return "Silver";
    if (type.includes("gold")) return "Gold";
    return "Base Metal";
  }
  const key = metal.toLowerCase();
  if (key.includes("base metal") || key === "alloy") return "Base Metal";
  if (key.includes("rose")) return "Rose Gold";
  if (key.includes("platinum")) return "Platinum";
  if (key.includes("silver")) return "Silver";
  if (key.includes("gold")) return "Gold";
  return "Base Metal";
};

const mapLegacyPurity = (value: unknown, metal: MetalType): Purity => {
  const num = cellNumber(value);
  if (num === 999 || num === 925) return "925";
  if (num === 24) return "24K";
  if (num === 22) return "22K";
  if (num === 18) return "18K";
  if (num === 14) return "14K";
  if (typeof value === "string") {
    const text = value.trim().toUpperCase();
    if (["24K", "22K", "18K", "14K", "925"].includes(text)) {
      return text as Purity;
    }
  }
  if (metal === "Silver" || metal === "Base Metal") return "925";
  return "22K";
};

export const mapStockExcelRows = (
  json: Record<string, unknown>[],
): { rows: LegacyStockImportRow[]; errors: string[] } => {
  const rows: LegacyStockImportRow[] = [];
  const errors: string[] = [];

  json.forEach((raw, index) => {
    const parsed: ParsedRow = {};
    for (const [header, value] of Object.entries(raw)) {
      const key = HEADER_ALIASES[normalizeHeader(header)];
      if (!key) continue;
      if (key === "wtGross" || key === "wtNet" || key === "wtOther" || key === "wtStone" || key === "retailPrice" || key === "cost") {
        parsed[key] = cellNumber(value);
      } else if (key === "purity") {
        parsed.purity = value as string | number;
      } else {
        parsed[key] = cellText(value);
      }
    }

    const rowNum = index + 2;
    const catalogNo = parsed.catalogNo?.trim();
    const itemCode = parsed.itemCode?.trim();
    const name = parsed.name?.trim();
    const weight = parsed.wtNet ?? parsed.wtGross;
    const retailPrice = parsed.retailPrice;

    if (!catalogNo) {
      errors.push(`Row ${rowNum}: SKU NO is required.`);
      return;
    }
    if (!itemCode) {
      errors.push(`Row ${rowNum}: Item barcode is required.`);
      return;
    }
    if (!name) {
      errors.push(`Row ${rowNum}: Item description is required.`);
      return;
    }
    if (!weight || weight <= 0) {
      errors.push(`Row ${rowNum}: Weight must be greater than zero.`);
      return;
    }
    if (!retailPrice || retailPrice <= 0) {
      errors.push(`Row ${rowNum}: Retail price is required.`);
      return;
    }

    const metal = mapLegacyMetal(parsed.metal ?? "", parsed.stockType);
    const purity = mapLegacyPurity(parsed.purity, metal);

    rows.push({
      catalogNo,
      itemCode,
      name,
      category: mapLegacyCategory(parsed.category ?? "Others"),
      subCategory: parsed.subCategory || undefined,
      collection: parsed.collection || undefined,
      vendor: parsed.vendor || undefined,
      metal,
      purity,
      weightGrams: weight,
      stoneName: parsed.stoneName || undefined,
      retailPrice,
      hsn: parsed.hsn || undefined,
      stockType: parsed.stockType || undefined,
    });
  });

  return { rows, errors };
};

export const STOCK_FORM_METALS: MetalType[] = [
  "Gold",
  "Silver",
  "Base Metal",
  "Platinum",
  "Rose Gold",
];

export const STOCK_FORM_PURITIES: Purity[] = ["24K", "22K", "18K", "14K", "925"];

export const STOCK_SUB_CATEGORIES = [
  "Plain",
  "Silver Plated",
  "Gold Plated",
  "Enamel",
  "Studded",
  "Other",
] as const;

export const STOCK_COLLECTIONS = [
  "Chinar",
  "Art Objects",
  "Classic",
  "Contemporary",
  "Bridal",
  "Other",
] as const;

export const HSN_OPTIONS = [
  { value: "", label: "None" },
  { value: "7113", label: "7113 — Jewellery" },
  { value: "7114", label: "7114 — Goldsmith articles" },
  { value: "7117", label: "7117 — Imitation jewellery" },
] as const;

export const stockCategories = PRODUCT_CATEGORIES;
