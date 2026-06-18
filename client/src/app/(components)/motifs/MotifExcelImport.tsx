"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload } from "lucide-react";
import {
  mapExcelRows,
  MOTIF_EXCEL_HEADERS,
  MOTIF_METALS,
  MOTIF_STONE_TYPES,
  MOTIF_SUB_CATEGORIES,
  validateMotifExcelRow,
  type MotifExcelRow,
} from "@/lib/motifs/constants";
import type { MotifMetal, MotifStoneType, MotifSubCategory, NewMotifInput } from "@/lib/types";
import { processImageFile } from "@/lib/inventory/images";
import { getApiErrorMessage } from "@/lib/api/client";

type MotifExcelImportProps = {
  disabled?: boolean;
  onImport: (items: NewMotifInput[]) => Promise<{ created: number; errors: string[] }>;
};

const toMotifInput = (
  row: MotifExcelRow,
  imageMap: Map<string, string>,
): NewMotifInput => ({
  name: row.name.trim(),
  description: row.description.trim() || undefined,
  weightGrams: row.weightGrams,
  metal: row.metal.trim() as MotifMetal,
  stone1: (row.stone1.trim() || undefined) as MotifStoneType | undefined,
  stone2: (row.stone2.trim() || undefined) as MotifStoneType | undefined,
  stone3: (row.stone3.trim() || undefined) as MotifStoneType | undefined,
  subCategory: row.subCategory.trim() as MotifSubCategory,
  price: row.price,
  imageUrl: row.imageFile ? imageMap.get(row.imageFile.toLowerCase()) : undefined,
});

export default function MotifExcelImport({
  disabled = false,
  onImport,
}: MotifExcelImportProps) {
  const excelRef = useRef<HTMLInputElement>(null);
  const imageRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<MotifExcelRow[]>([]);
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
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
    const { rows: parsed, errors } = mapExcelRows(json);
    const validationErrors = parsed.flatMap((row, i) =>
      validateMotifExcelRow(row, i + 2),
    );
    setRows(parsed);
    setParseErrors([...errors, ...validationErrors]);
  };

  const handleImport = async () => {
    if (!rows.length) return;
    setImporting(true);
    setResult(null);
    try {
      const imageMap = new Map<string, string>();
      for (const file of imageFiles) {
        const url = await processImageFile(file);
        imageMap.set(file.name.toLowerCase(), url);
      }

      const missingImages = rows
        .filter((row) => row.imageFile)
        .filter((row) => !imageMap.has(row.imageFile.toLowerCase()))
        .map((row) => row.imageFile);

      const items = rows.map((row) => toMotifInput(row, imageMap));
      const { created, errors } = await onImport(items);
      const allErrors = [
        ...parseErrors,
        ...errors,
        ...missingImages.map(
          (name) => `Image not uploaded for file name "${name}".`,
        ),
      ];
      setResult(
        `Imported ${created} motif${created === 1 ? "" : "s"}.${
          allErrors.length ? ` ${allErrors.length} issue(s) — see below.` : ""
        }`,
      );
      if (allErrors.length) setParseErrors(allErrors);
      if (created > 0) {
        setRows([]);
        setImageFiles([]);
      }
    } catch (err) {
      setResult(getApiErrorMessage(err, "Import failed."));
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="surface-card rounded-xl p-5 space-y-4 h-full">
      <div>
        <h2 className="text-base font-semibold text-zinc-900">Import from Excel</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Columns: {MOTIF_EXCEL_HEADERS.join(", ")}
        </p>
      </div>

      <a
        href="/samples/motif-import-sample.xlsx"
        download
        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
      >
        <FileSpreadsheet size={16} />
        Download sample Excel (25 motifs)
      </a>

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
            ? `${rows.length} row(s) ready to import`
            : "Accepts .xlsx, .xls, .csv"}
        </p>
      </div>

      <div>
        <label className="text-xs block mb-1 text-zinc-500 font-medium">
          Motif images (optional)
        </label>
        <input
          ref={imageRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="input-field w-full text-sm"
          disabled={disabled}
          onChange={(e) => {
            setImageFiles(Array.from(e.target.files ?? []));
            e.target.value = "";
          }}
        />
        <p className="text-[11px] text-zinc-400 mt-1">
          Match file names to the ImageFile column (e.g. moon-charm.jpg)
        </p>
        {imageFiles.length > 0 && (
          <p className="text-xs text-zinc-600 mt-1">
            {imageFiles.length} image(s) selected
          </p>
        )}
      </div>

      <div className="text-[11px] text-zinc-500 space-y-1">
        <p>Valid metals: {MOTIF_METALS.join(", ")}</p>
        <p>Valid stones: {MOTIF_STONE_TYPES.join(", ")} (leave blank if none)</p>
        <p>Valid subcategories: {MOTIF_SUB_CATEGORIES.join(", ")}</p>
      </div>

      {parseErrors.length > 0 && (
        <div className="max-h-28 overflow-y-auto text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
          {parseErrors.map((err) => (
            <p key={err}>{err}</p>
          ))}
        </div>
      )}

      {result && <p className="text-sm text-zinc-700">{result}</p>}

      <button
        type="button"
        disabled={disabled || importing || rows.length === 0}
        onClick={() => void handleImport()}
        className="btn-primary w-full py-2.5 text-sm"
      >
        {importing ? "Importing…" : `Import ${rows.length || ""} motif(s)`}
      </button>
    </div>
  );
}
