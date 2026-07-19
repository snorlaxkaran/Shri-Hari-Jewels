import type { WorkBook } from "xlsx";
import * as XLSX from "xlsx";

export const MAX_EXCEL_FILE_BYTES = 5 * 1024 * 1024;
export const EXCEL_PARSE_TIMEOUT_MS = 10_000;

export function assertExcelFileSize(file: File): void {
  if (file.size > MAX_EXCEL_FILE_BYTES) {
    throw new Error(
      `File is too large (${(file.size / (1024 * 1024)).toFixed(1)}MB). Maximum size is 5MB.`,
    );
  }
}

/** Parse workbook with a timeout guard (mitigates hung tabs from malicious xlsx). */
export async function readExcelWorkbook(buffer: ArrayBuffer): Promise<WorkBook> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(
        new Error(
          "Excel parse timed out. The file may be malformed — try a smaller export.",
        ),
      );
    }, EXCEL_PARSE_TIMEOUT_MS);

    window.setTimeout(() => {
      try {
        const workbook = XLSX.read(buffer, { type: "array" });
        clearTimeout(timer);
        resolve(workbook);
      } catch (err) {
        clearTimeout(timer);
        reject(err instanceof Error ? err : new Error("Failed to parse Excel file."));
      }
    }, 0);
  });
}
