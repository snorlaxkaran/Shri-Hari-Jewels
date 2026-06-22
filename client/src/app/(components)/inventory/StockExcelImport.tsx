"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload } from "lucide-react";
import {
  mapStockExcelRows,
  STOCK_EXCEL_HEADERS,
} from "@/lib/inventory/stock-import";
import type { BulkStockImportResult, LegacyStockImportRow } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

type StockExcelImportProps = {
  disabled?: boolean;
  onImport: (rows: LegacyStockImportRow[]) => Promise<BulkStockImportResult>;
  onComplete?: () => void;
};

export default function StockExcelImport({
  disabled = false,
  onImport,
  onComplete,
}: StockExcelImportProps) {
  const excelRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<LegacyStockImportRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [importErrors, setImportErrors] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleExcel = async (file: File) => {
    setResult(null);
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: "array" });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: "",
    });
    const { rows: parsed, errors } = mapStockExcelRows(json);
    setRows(parsed);
    setValidationErrors(errors);
    setImportErrors([]);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setResult(null);
    try {
      const importResult = await onImport(rows);
      const allErrors = [...importResult.errors];
      setImportErrors(allErrors);
      setResult(
        `Imported ${importResult.created} new SKU(s) and ${importResult.unitsAdded} unit(s).${
          allErrors.length ? ` ${allErrors.length} issue(s) — see below.` : ""
        }`,
      );
      if (allErrors.length) setImportErrors(allErrors);
      if (importResult.unitsAdded > 0) {
        setRows([]);
        onComplete?.();
      }
    } catch (err) {
      setResult(getApiErrorMessage(err, "Import failed."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="surface-card rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">
          Import legacy stock from Excel
        </h2>
        <p className="text-xs text-zinc-500 mt-1">
          Upload your existing stock sheet (e.g. Book1.xlsx). Rows are grouped by
          SKU NO; each barcode becomes one inventory unit.
        </p>
      </div>

      <p className="text-[11px] text-zinc-500">
        Expected columns: {STOCK_EXCEL_HEADERS.slice(0, 8).join(", ")}, …
      </p>

      <div
        onClick={() => !disabled && excelRef.current?.click()}
        className="rounded-xl border-2 border-dashed border-zinc-200 p-5 text-center cursor-pointer hover:bg-zinc-50"
      >
        <input
          ref={excelRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleExcel(file);
            e.target.value = "";
          }}
        />
        <Upload size={24} className="mx-auto mb-2 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700">Upload Excel file</p>
        <p className="text-xs text-zinc-400 mt-1">
          {rows.length > 0
            ? `${rows.length} row(s) ready — ${new Set(rows.map((r) => r.catalogNo)).size} SKU(s)`
            : "Accepts .xlsx, .xls, .csv"}
        </p>
      </div>

      {(validationErrors.length > 0 || importErrors.length > 0) && (
        <div className="max-h-32 overflow-y-auto text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {[...validationErrors, ...importErrors].map((err, i) => (
            <p key={`${err}-${i}`}>{err}</p>
          ))}
        </div>
      )}

      {result && <p className="text-sm text-zinc-700">{result}</p>}

      <button
        type="button"
        disabled={disabled || importing || rows.length === 0 || validationErrors.length > 0}
        onClick={() => void handleImport()}
        className="btn-primary w-full py-2.5 text-sm disabled:opacity-50"
      >
        {importing
          ? "Importing…"
          : `Import ${rows.length || ""} row(s) to main stock`}
      </button>
    </div>
  );
}
