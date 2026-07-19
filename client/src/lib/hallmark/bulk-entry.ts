import { HUID_PATTERN, normalizeHuid } from "@/lib/hallmark/huid";
import type { HallmarkBatchItemDetail } from "@/lib/types";

export type BulkHuidRow = {
  itemCode: string;
  inventoryUnitId: string;
  productName: string;
  huid: string;
};

export type BulkHuidParseResult =
  | { ok: true; rows: BulkHuidRow[] }
  | { ok: false; errors: string[] };

const tokenizeLine = (line: string): string[] =>
  line
    .trim()
    .split(/[\s,\t]+/)
    .map((part) => part.trim())
    .filter(Boolean);

export const parseBulkHuidPaste = (
  text: string,
  pendingItems: HallmarkBatchItemDetail[],
): BulkHuidParseResult => {
  const errors: string[] = [];
  const byItemCode = new Map(
    pendingItems.map((item) => [item.itemCode.toLowerCase(), item]),
  );
  const seenHuids = new Set<string>();
  const rows: BulkHuidRow[] = [];

  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { ok: false, errors: ["Paste at least one line with item code and HUID."] };
  }

  lines.forEach((line, index) => {
    const tokens = tokenizeLine(line);
    if (tokens.length !== 2) {
      errors.push(`Line ${index + 1}: expected item code and HUID (found ${tokens.length} values).`);
      return;
    }

    const [itemCodeRaw, huidRaw] = tokens;
    const item = byItemCode.get(itemCodeRaw.toLowerCase());
    if (!item) {
      errors.push(`Line ${index + 1}: item code ${itemCodeRaw} is not pending in this batch.`);
      return;
    }

    const huid = normalizeHuid(huidRaw);
    if (!HUID_PATTERN.test(huid)) {
      errors.push(`Line ${index + 1}: HUID ${huidRaw} must be exactly 6 letters or numbers.`);
      return;
    }

    if (seenHuids.has(huid)) {
      errors.push(`Line ${index + 1}: duplicate HUID ${huid} in paste.`);
      return;
    }
    seenHuids.add(huid);

    rows.push({
      itemCode: item.itemCode,
      inventoryUnitId: item.inventoryUnitId,
      productName: item.productName,
      huid,
    });
  });

  if (errors.length > 0) {
    return { ok: false, errors };
  }

  return { ok: true, rows };
};
