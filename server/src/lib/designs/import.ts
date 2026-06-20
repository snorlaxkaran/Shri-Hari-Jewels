import type { DesignElement, Motif } from "../../types.js";
import { DesignError } from "./service.js";

export type DesignImportRow = {
  rowNumber: number;
  elementName: string;
  qtyPerSet: number;
  totalQty?: number;
  matchedMotifId?: string;
  matchedMotifName?: string;
  matchConfidence: "exact" | "fuzzy" | "none";
  suggestedMotifs: Array<{ id: string; name: string; score: number }>;
};

export type DesignImportPreview = {
  designCode: string;
  sheetName: string;
  codeMismatch: boolean;
  rows: DesignImportRow[];
  existingElements: DesignElement[];
  warnings: string[];
};

const normalizeHeader = (value: unknown): string =>
  String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const findColumn = (
  headers: string[],
  aliases: string[],
): number => {
  for (const alias of aliases) {
    const idx = headers.findIndex((h) => h === alias || h.includes(alias));
    if (idx >= 0) return idx;
  }
  return -1;
};

const levenshtein = (a: string, b: string): number => {
  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      matrix[i][j] =
        b.charAt(i - 1) === a.charAt(j - 1)
          ? matrix[i - 1][j - 1]
          : Math.min(
              matrix[i - 1][j - 1] + 1,
              matrix[i][j - 1] + 1,
              matrix[i - 1][j] + 1,
            );
    }
  }
  return matrix[b.length][a.length];
};

const fuzzyScore = (a: string, b: string): number => {
  const left = a.trim().toLowerCase();
  const right = b.trim().toLowerCase();
  if (!left || !right) return 0;
  if (left === right) return 1;
  if (left.includes(right) || right.includes(left)) return 0.85;
  const maxLen = Math.max(left.length, right.length);
  const dist = levenshtein(left, right);
  return Math.max(0, 1 - dist / maxLen);
};

export const matchMotifForElement = (
  elementName: string,
  motifs: Motif[],
): Pick<
  DesignImportRow,
  "matchedMotifId" | "matchedMotifName" | "matchConfidence" | "suggestedMotifs"
> => {
  const trimmed = elementName.trim();
  if (!trimmed) {
    return {
      matchConfidence: "none",
      suggestedMotifs: [],
    };
  }

  const scored = motifs
    .map((m) => ({
      id: m.id,
      name: m.name,
      score: fuzzyScore(trimmed, m.name),
    }))
    .filter((m) => m.score > 0.4)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const best = scored[0];
  if (!best) {
    return { matchConfidence: "none", suggestedMotifs: [] };
  }

  if (best.score >= 0.99) {
    return {
      matchedMotifId: best.id,
      matchedMotifName: best.name,
      matchConfidence: "exact",
      suggestedMotifs: scored,
    };
  }

  if (best.score >= 0.7) {
    return {
      matchedMotifId: best.id,
      matchedMotifName: best.name,
      matchConfidence: "fuzzy",
      suggestedMotifs: scored,
    };
  }

  return {
    matchConfidence: "none",
    suggestedMotifs: scored,
  };
};

export type ParsedSheetRow = {
  elementName: string;
  qtyPerSet: number;
  totalQty?: number;
};

export const parseDesignImportRows = (
  rows: unknown[][],
  sheetName: string,
): { designCode: string; parsedRows: ParsedSheetRow[]; warnings: string[] } => {
  if (rows.length < 2) {
    throw new DesignError("Import sheet must have a header row and data.");
  }

  const headers = rows[0].map(normalizeHeader);
  const snoCol = findColumn(headers, ["s.no", "sno", "serial", "#"]);
  const elementCol = findColumn(headers, ["element", "motif", "component"]);
  const qtyCol = findColumn(headers, ["1 set", "qty per set", "per set", "1set"]);
  const totalCol = findColumn(headers, ["total qty", "total pcs", "total"]);

  if (elementCol < 0) {
    throw new DesignError('Could not find "Element" column in import sheet.');
  }
  if (qtyCol < 0) {
    throw new DesignError('Could not find "1 set" quantity column in import sheet.');
  }

  const warnings: string[] = [];
  let designCode = sheetName.trim().toUpperCase();

  for (let i = 1; i < Math.min(rows.length, 6); i++) {
    const row = rows[i];
    const firstCell = String(row[0] ?? "").trim().toUpperCase();
    if (/^[A-Z0-9-]+$/.test(firstCell) && firstCell.length >= 4) {
      if (firstCell !== designCode && firstCell !== sheetName.toUpperCase()) {
        warnings.push(
          `Row ${i + 1} contains SKU code "${firstCell}" which differs from sheet name "${sheetName}". Using sheet name as design code.`,
        );
      }
      if (!designCode || designCode === sheetName.toUpperCase()) {
        designCode = firstCell;
      }
    }
  }

  const parsedRows: ParsedSheetRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const elementName = String(row[elementCol] ?? "").trim();
    if (!elementName) continue;

    const qtyRaw = row[qtyCol];
    const qtyPerSet = Number(qtyRaw);
    if (!Number.isFinite(qtyPerSet) || qtyPerSet < 1) {
      warnings.push(`Row ${i + 1}: invalid qty per set "${qtyRaw}", skipped.`);
      continue;
    }

    let totalQty: number | undefined;
    if (totalCol >= 0) {
      const totalRaw = row[totalCol];
      const parsed = Number(totalRaw);
      if (Number.isFinite(parsed)) totalQty = parsed;
    }

    if (snoCol >= 0 && !row[snoCol] && !elementName) continue;

    parsedRows.push({ elementName, qtyPerSet, totalQty });
  }

  if (parsedRows.length === 0) {
    throw new DesignError("No valid element rows found in import sheet.");
  }

  return { designCode, parsedRows, warnings };
};

export const buildImportPreview = (
  designCode: string,
  sheetName: string,
  parsedRows: ParsedSheetRow[],
  motifs: Motif[],
  existingElements: DesignElement[],
  warnings: string[],
): DesignImportPreview => {
  const codeMismatch =
    sheetName.trim().toUpperCase() !== designCode.trim().toUpperCase();

  const rows: DesignImportRow[] = parsedRows.map((row, index) => {
    const match = matchMotifForElement(row.elementName, motifs);
    return {
      rowNumber: index + 2,
      elementName: row.elementName,
      qtyPerSet: row.qtyPerSet,
      totalQty: row.totalQty,
      ...match,
    };
  });

  return {
    designCode,
    sheetName,
    codeMismatch,
    rows,
    existingElements,
    warnings,
  };
};

export type ConfirmedImportRow = {
  elementName: string;
  qtyPerSet: number;
  motifId?: string;
  type?: "Motif" | "Stone" | "Casting";
};

export const confirmedRowsToElements = (
  rows: ConfirmedImportRow[],
): Array<{
  name: string;
  type: "Motif" | "Stone" | "Casting";
  qtyPerSet: number;
  motifId?: string;
}> =>
  rows.map((row) => ({
    name: row.elementName.trim(),
    type: row.motifId ? "Motif" : row.type ?? "Stone",
    qtyPerSet: row.qtyPerSet,
    motifId: row.motifId,
  }));
