import type {
  BulkCollectionChangeRow,
  BulkItemUpdateRow,
  BulkSkuChangeRow,
} from "@/lib/types";

/** Header labels shown to the user and written into the downloadable templates. */
export const COLLECTION_CHANGE_HEADERS = [
  "SKU",
  "Current Collection ID/ Name",
  "Change to Collection Name/ ID",
] as const;

export const SKU_CHANGE_HEADERS = ["Item Code", "New SKU"] as const;

export const ITEM_UPDATE_HEADERS = [
  "Item Code",
  "SKU (Updated)",
  "Price (Updated)",
  "Cost (Updated)",
  "Weight (Updated)",
  "Description (Updated)",
] as const;

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const cellText = (value: unknown): string => {
  if (value == null) return "";
  const text = String(value).trim();
  return text === "-" ? "" : text;
};

/**
 * Header aliases are matched loosely so a sheet exported from Central Stock, or
 * one typed by hand, both land on the same field.
 */
const COLLECTION_ALIASES: Record<string, keyof BulkCollectionChangeRow> = {
  sku: "sku",
  "sku no": "sku",
  "sku no.": "sku",
  "catalog no": "sku",
  "current collection": "currentCollection",
  "current collection id": "currentCollection",
  "current collection name": "currentCollection",
  "current collection id/ name": "currentCollection",
  "current collection id/name": "currentCollection",
  "current collection name/ id": "currentCollection",
  "current collection name/id": "currentCollection",
  "old collection": "currentCollection",
  collection: "newCollection",
  "new collection": "newCollection",
  "change to collection": "newCollection",
  "change to collection name": "newCollection",
  "change to collection id": "newCollection",
  "change to collection name/ id": "newCollection",
  "change to collection name/id": "newCollection",
  "change to collection id/ name": "newCollection",
  "change to collection id/name": "newCollection",
  "new collection name": "newCollection",
  "new collection id": "newCollection",
};

const ITEM_UPDATE_ALIASES: Record<string, keyof BulkItemUpdateRow> = {
  "item code": "itemCode",
  "item code (unique)": "itemCode",
  itemcode: "itemCode",
  barcode: "itemCode",
  "item no/ barcode": "itemCode",
  "item no/barcode": "itemCode",
  "sku (updated)": "newSku",
  "sku updated": "newSku",
  "new sku": "newSku",
  sku: "newSku",
  "price (updated)": "newPrice",
  "price updated": "newPrice",
  "new price": "newPrice",
  "retail price (updated)": "newPrice",
  "cost (updated)": "newCost",
  "cost updated": "newCost",
  "new cost": "newCost",
  "weight (updated)": "newWeight",
  "weight updated": "newWeight",
  "new weight": "newWeight",
  "weight (g) (updated)": "newWeight",
  "description (updated)": "newDescription",
  "description updated": "newDescription",
  "name (updated)": "newDescription",
  "product name (updated)": "newDescription",
};

const SKU_ALIASES: Record<string, keyof BulkSkuChangeRow> = {
  "item code": "itemCode",
  "item code (unique)": "itemCode",
  itemcode: "itemCode",
  barcode: "itemCode",
  "item no/ barcode": "itemCode",
  "item no/barcode": "itemCode",
  "new sku": "newSku",
  sku: "newSku",
  "sku no": "newSku",
  "change to sku": "newSku",
  "new sku no": "newSku",
};

const mapRow = <T extends string>(
  raw: Record<string, unknown>,
  aliases: Record<string, T>,
): Partial<Record<T, string>> => {
  const mapped: Partial<Record<T, string>> = {};
  for (const [header, value] of Object.entries(raw)) {
    const key = aliases[normalizeHeader(header)];
    // A blank cell must not overwrite a value already found under an alias.
    if (!key || mapped[key]) continue;
    mapped[key] = cellText(value);
  }
  return mapped;
};

export const mapCollectionChangeRows = (
  json: Record<string, unknown>[],
): { rows: BulkCollectionChangeRow[]; errors: string[] } => {
  const rows: BulkCollectionChangeRow[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();

  json.forEach((raw, index) => {
    const rowNum = index + 2;
    const parsed = mapRow(raw, COLLECTION_ALIASES);
    const sku = parsed.sku?.toUpperCase() ?? "";
    const newCollection = parsed.newCollection ?? "";

    if (!sku && !newCollection) return;

    if (!sku) {
      errors.push(`Row ${rowNum}: SKU is required.`);
      return;
    }
    if (!newCollection) {
      errors.push(`Row ${rowNum}: "Change to Collection" is required.`);
      return;
    }

    const duplicateOf = seen.get(sku);
    if (duplicateOf) {
      errors.push(
        `Row ${rowNum}: SKU ${sku} already appears on row ${duplicateOf}. Keep one row per SKU.`,
      );
      return;
    }
    seen.set(sku, rowNum);

    rows.push({
      sku,
      currentCollection: parsed.currentCollection || undefined,
      newCollection,
    });
  });

  if (!rows.length && !errors.length) {
    errors.push(
      `No usable rows found. Expected columns: ${COLLECTION_CHANGE_HEADERS.join(", ")}.`,
    );
  }

  return { rows, errors };
};

const parseOptionalNumber = (
  raw: string | undefined,
  field: string,
  rowNum: number,
  errors: string[],
  options?: { min?: number; allowZero?: boolean },
): number | undefined => {
  if (!raw) return undefined;
  const normalized = raw.replace(/,/g, "");
  const num = Number(normalized);
  if (!Number.isFinite(num)) {
    errors.push(`Row ${rowNum}: "${field}" must be a number.`);
    return undefined;
  }
  const min = options?.min ?? (options?.allowZero ? 0 : undefined);
  if (min !== undefined && num < min) {
    errors.push(`Row ${rowNum}: "${field}" must be at least ${min}.`);
    return undefined;
  }
  if (options?.allowZero) {
    if (num < 0) {
      errors.push(`Row ${rowNum}: "${field}" cannot be negative.`);
      return undefined;
    }
  } else if (num <= 0) {
    errors.push(`Row ${rowNum}: "${field}" must be greater than zero.`);
    return undefined;
  }
  return num;
};

export const mapItemUpdateRows = (
  json: Record<string, unknown>[],
): { rows: BulkItemUpdateRow[]; errors: string[] } => {
  const rows: BulkItemUpdateRow[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();

  json.forEach((raw, index) => {
    const rowNum = index + 2;
    const parsed = mapRow(raw, ITEM_UPDATE_ALIASES);
    const itemCode = parsed.itemCode ?? "";
    const newSku = parsed.newSku?.toUpperCase() ?? "";
    const newDescription = parsed.newDescription?.trim() ?? "";
    const newPrice = parseOptionalNumber(
      parsed.newPrice,
      "Price (Updated)",
      rowNum,
      errors,
    );
    const newCost = parseOptionalNumber(
      parsed.newCost,
      "Cost (Updated)",
      rowNum,
      errors,
      { allowZero: true },
    );
    const newWeight = parseOptionalNumber(
      parsed.newWeight,
      "Weight (Updated)",
      rowNum,
      errors,
    );

    const hasUpdate =
      !!newSku ||
      newPrice !== undefined ||
      newCost !== undefined ||
      newWeight !== undefined ||
      !!newDescription;

    if (!itemCode && !hasUpdate) return;

    if (!itemCode) {
      errors.push(`Row ${rowNum}: Item Code is required.`);
      return;
    }
    if (!hasUpdate) {
      errors.push(
        `Row ${rowNum}: fill at least one updated column (SKU, Price, Cost, Weight, or Description).`,
      );
      return;
    }

    const duplicateOf = seen.get(itemCode.toUpperCase());
    if (duplicateOf) {
      errors.push(
        `Row ${rowNum}: Item code ${itemCode} already appears on row ${duplicateOf}. Item codes must be unique.`,
      );
      return;
    }
    seen.set(itemCode.toUpperCase(), rowNum);

    rows.push({
      itemCode,
      ...(newSku ? { newSku } : {}),
      ...(newPrice !== undefined ? { newPrice } : {}),
      ...(newCost !== undefined ? { newCost } : {}),
      ...(newWeight !== undefined ? { newWeight } : {}),
      ...(newDescription ? { newDescription } : {}),
    });
  });

  if (!rows.length && !errors.length) {
    errors.push(
      `No usable rows found. Expected columns: ${ITEM_UPDATE_HEADERS.join(", ")}.`,
    );
  }

  return { rows, errors };
};

export const mapSkuChangeRows = (
  json: Record<string, unknown>[],
): { rows: BulkSkuChangeRow[]; errors: string[] } => {
  const rows: BulkSkuChangeRow[] = [];
  const errors: string[] = [];
  const seen = new Map<string, number>();

  json.forEach((raw, index) => {
    const rowNum = index + 2;
    const parsed = mapRow(raw, SKU_ALIASES);
    const itemCode = parsed.itemCode ?? "";
    const newSku = parsed.newSku?.toUpperCase() ?? "";

    if (!itemCode && !newSku) return;

    if (!itemCode) {
      errors.push(`Row ${rowNum}: Item Code is required.`);
      return;
    }
    if (!newSku) {
      errors.push(`Row ${rowNum}: New SKU is required.`);
      return;
    }

    const duplicateOf = seen.get(itemCode.toUpperCase());
    if (duplicateOf) {
      errors.push(
        `Row ${rowNum}: Item code ${itemCode} already appears on row ${duplicateOf}. Item codes must be unique.`,
      );
      return;
    }
    seen.set(itemCode.toUpperCase(), rowNum);

    rows.push({ itemCode, newSku });
  });

  if (!rows.length && !errors.length) {
    errors.push(
      `No usable rows found. Expected columns: ${SKU_CHANGE_HEADERS.join(", ")}.`,
    );
  }

  return { rows, errors };
};
