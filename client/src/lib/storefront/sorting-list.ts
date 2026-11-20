import * as XLSX from "xlsx";

export type WebsiteSortingRow = {
  sku: string;
  collectionName: string;
  sortingNumber: number;
};

export const SORTING_LIST_HEADERS = [
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

const HEADER_ALIASES: Record<string, keyof WebsiteSortingRow> = {
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

export const mapSortingListRows = (
  json: Record<string, unknown>[],
): { rows: WebsiteSortingRow[]; errors: string[] } => {
  const errors: string[] = [];
  const rows: WebsiteSortingRow[] = [];

  json.forEach((raw, rowIndex) => {
    const line = rowIndex + 2;
    const mapped: Partial<WebsiteSortingRow> = {};

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
    if (mapped.sortingNumber == null || !Number.isFinite(mapped.sortingNumber)) {
      errors.push(`Row ${line} (${mapped.sku}): sorting number must be numeric.`);
      return;
    }

    rows.push({
      sku: mapped.sku,
      collectionName: mapped.collectionName ?? "",
      sortingNumber: mapped.sortingNumber,
    });
  });

  return { rows, errors };
};

export const downloadSortingListWorkbook = (
  rows: WebsiteSortingRow[],
): { count: number } => {
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [...SORTING_LIST_HEADERS],
    ...rows.map((row) => [row.sku, row.collectionName, row.sortingNumber]),
  ]);
  sheet["!cols"] = [{ wch: 24 }, { wch: 28 }, { wch: 18 }];
  if (sheet["!ref"]) sheet["!autofilter"] = { ref: sheet["!ref"] };
  XLSX.utils.book_append_sheet(workbook, sheet, "Sorting");

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Shop sorting list", "Instructions"],
    ["Get sorting list", "Download current order for products live on the website."],
    ["Set sorting", "Edit Sorting number (higher = nearer the top). Re-upload with Set sorting."],
    ["Collection name", "Optional on upload — leave blank to change sort only; fill to assign a collection."],
  ]);
  instructions["!cols"] = [{ wch: 22 }, { wch: 72 }];
  XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");

  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `website-sorting-list-${date}.xlsx`);
  return { count: rows.length };
};

export const parseSortingWorkbook = (
  buffer: ArrayBuffer,
): { rows: WebsiteSortingRow[]; errors: string[] } => {
  const workbook = XLSX.read(buffer, { type: "array" });
  const sheetName =
    workbook.SheetNames.find((name) => name.trim().toLowerCase() === "sorting") ??
    workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return { rows: [], errors: ["Workbook has no sheets."] };

  const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: "",
  });
  return mapSortingListRows(json);
};
