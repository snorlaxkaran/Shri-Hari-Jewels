"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { Download, Loader2, Upload } from "lucide-react";
import {
  assertExcelFileSize,
  readExcelWorkbook,
} from "@/lib/excel-import-guard";
import { exportToExcel } from "@/lib/reports/excel";
import { getApiErrorMessage } from "@/lib/api/client";
import type { BulkUpdateResult } from "@/lib/types";

const PREVIEW_LIMIT = 10;

export type BulkUpdateColumn<TRow> = {
  label: string;
  value: (row: TRow) => string;
};

type BulkUpdateCardProps<TRow> = {
  title: string;
  description: string;
  headers: readonly string[];
  /** Example row written under the header of the downloadable template. */
  sampleRow: readonly string[];
  templateFileName: string;
  columns: BulkUpdateColumn<TRow>[];
  parse: (json: Record<string, unknown>[]) => { rows: TRow[]; errors: string[] };
  onApply: (rows: TRow[]) => Promise<BulkUpdateResult>;
  applyLabel: string;
  disabled?: boolean;
};

export default function BulkUpdateCard<TRow>({
  title,
  description,
  headers,
  sampleRow,
  templateFileName,
  columns,
  parse,
  onApply,
  applyLabel,
  disabled = false,
}: BulkUpdateCardProps<TRow>) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<TRow[]>([]);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverErrors, setServerErrors] = useState<string[]>([]);
  const [summary, setSummary] = useState("");
  const [applying, setApplying] = useState(false);

  const reset = () => {
    setValidationErrors([]);
    setServerErrors([]);
    setSummary("");
  };

  const handleFile = async (file: File) => {
    reset();
    setRows([]);
    setFileName(file.name);

    try {
      assertExcelFileSize(file);
      const workbook = await readExcelWorkbook(await file.arrayBuffer());
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) {
        setValidationErrors(["That file has no sheets."]);
        return;
      }
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
        defval: "",
      });
      const parsed = parse(json);
      setRows(parsed.rows);
      setValidationErrors(parsed.errors);
    } catch (err) {
      setValidationErrors([
        err instanceof Error ? err.message : "Failed to read the file.",
      ]);
    }
  };

  const handleApply = async () => {
    if (!rows.length) return;
    reset();
    setApplying(true);
    try {
      const result = await onApply(rows);
      setServerErrors(result.errors);

      const parts = [`${result.updated} row(s) updated`];
      if (result.unchanged > 0) {
        parts.push(`${result.unchanged} already correct`);
      }
      if (result.productsCreated > 0) {
        parts.push(`${result.productsCreated} new SKU(s) created`);
      }
      if (result.errors.length > 0) {
        parts.push(`${result.errors.length} row(s) skipped — see below`);
      }
      setSummary(`${parts.join(", ")}.`);

      if (result.updated > 0 && result.errors.length === 0) {
        setRows([]);
        setFileName("");
      }
    } catch (err) {
      setValidationErrors([getApiErrorMessage(err, "Update failed.")]);
    } finally {
      setApplying(false);
    }
  };

  const previewRows = rows.slice(0, PREVIEW_LIMIT);
  const allErrors = [...validationErrors, ...serverErrors];

  return (
    <div className="surface-card rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-500 mt-1 leading-relaxed">{description}</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-[11px] text-zinc-500 flex-1 min-w-[200px]">
          Expected columns: {headers.join(" | ")}
        </p>
        <button
          type="button"
          onClick={() =>
            exportToExcel(templateFileName, [...headers], [[...sampleRow]])
          }
          className="btn-secondary inline-flex items-center gap-1.5 px-3 py-1.5 text-xs"
        >
          <Download size={14} />
          Template
        </button>
      </div>

      <div
        onClick={() => !disabled && fileRef.current?.click()}
        className="rounded-xl border-2 border-dashed border-zinc-200 p-5 text-center cursor-pointer hover:bg-zinc-50"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleFile(file);
            e.target.value = "";
          }}
        />
        <Upload size={24} className="mx-auto mb-2 text-zinc-400" />
        <p className="text-sm font-medium text-zinc-700">Upload Excel file</p>
        <p className="text-xs text-zinc-400 mt-1">
          {rows.length > 0
            ? `${fileName} — ${rows.length} row(s) ready`
            : fileName || "Accepts .xlsx, .xls, .csv"}
        </p>
      </div>

      {previewRows.length > 0 && (
        <div className="overflow-x-auto rounded-lg border border-zinc-200">
          <table className="w-full text-xs">
            <thead className="bg-zinc-50 text-zinc-500">
              <tr>
                {columns.map((column) => (
                  <th key={column.label} className="text-left font-medium px-3 py-2">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {previewRows.map((row, index) => (
                <tr key={index} className="border-t border-zinc-100">
                  {columns.map((column) => (
                    <td key={column.label} className="px-3 py-2 text-zinc-700">
                      {column.value(row) || "—"}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length > PREVIEW_LIMIT && (
            <p className="px-3 py-2 text-[11px] text-zinc-500 bg-zinc-50 border-t border-zinc-100">
              Showing first {PREVIEW_LIMIT} of {rows.length} rows.
            </p>
          )}
        </div>
      )}

      {allErrors.length > 0 && (
        <div className="max-h-40 overflow-y-auto text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {allErrors.map((err, i) => (
            <p key={`${err}-${i}`}>{err}</p>
          ))}
        </div>
      )}

      {summary && (
        <p className="px-4 py-3 rounded-lg text-sm border border-green-200 bg-green-50 text-green-800">
          {summary}
        </p>
      )}

      <button
        type="button"
        disabled={disabled || applying || rows.length === 0 || validationErrors.length > 0}
        onClick={() => void handleApply()}
        className="btn-primary w-full py-2.5 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {applying && <Loader2 size={16} className="animate-spin" />}
        {applying ? "Applying…" : `${applyLabel}${rows.length ? ` (${rows.length})` : ""}`}
      </button>
    </div>
  );
}
