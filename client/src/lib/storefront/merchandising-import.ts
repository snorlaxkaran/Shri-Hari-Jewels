import type { BulkUpdateResult } from "@/lib/types";

export type StorefrontMerchandisingRow = {
  sku: string;
  collectionName: string;
  sortingNumber: number;
};

export const MERCHANDISING_HEADERS = [
  "SKU",
  "Collection name",
  "Sorting number",
] as const;

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const cellText = (value: unknown): string => {
  if (value == null) return "";
  const text = String(value).trim();
  return text === "-" ? "" : text;
};

const HEADER_ALIASES: Record<string, keyof StorefrontMerchandisingRow> = {
  sku: "sku",
  "design no": "sku",
  "design no.": "sku",
  "design no. (sku)": "sku",
  "collection name": "collectionName",
  collection: "collectionName",
  "sorting number": "sortingNumber",
  sort: "sortingNumber",
  "sort order": "sortingNumber",
  priority: "sortingNumber",
};

export const mapMerchandisingRows = (
  json: Record<string, unknown>[],
): { rows: StorefrontMerchandisingRow[]; errors: string[] } => {
  const errors: string[] = [];
  const rows: StorefrontMerchandisingRow[] = [];

  json.forEach((raw, rowIndex) => {
    const line = rowIndex + 2;
    const mapped: Partial<StorefrontMerchandisingRow> = {};

    for (const [header, value] of Object.entries(raw)) {
      const key = HEADER_ALIASES[normalizeHeader(header)];
      if (!key) continue;
      if (key === "sortingNumber") {
        const num = Number(String(value).replace(/,/g, "").trim());
        if (Number.isFinite(num)) mapped.sortingNumber = num;
      } else if (key === "sku") {
        mapped.sku = cellText(value).toUpperCase();
      } else {
        mapped.collectionName = cellText(value);
      }
    }

    if (!mapped.sku && !mapped.collectionName && mapped.sortingNumber == null) {
      return;
    }

    if (!mapped.sku) {
      errors.push(`Row ${line}: SKU is required.`);
      return;
    }
    if (!mapped.collectionName) {
      errors.push(`Row ${line} (${mapped.sku}): collection name is required.`);
      return;
    }
    if (mapped.sortingNumber == null || !Number.isFinite(mapped.sortingNumber)) {
      errors.push(`Row ${line} (${mapped.sku}): sorting number must be numeric.`);
      return;
    }

    rows.push({
      sku: mapped.sku,
      collectionName: mapped.collectionName,
      sortingNumber: mapped.sortingNumber,
    });
  });

  return { rows, errors };
};

export type MerchandisingImportResult = BulkUpdateResult;
