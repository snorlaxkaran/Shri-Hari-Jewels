"use client";

import { useRef, useState } from "react";
import * as XLSX from "xlsx";
import type {
  ConfirmedDesignImportRow,
  DesignImportPreview,
  DesignImportRow,
} from "@/lib/types";
import {
  applyDesignImport,
  previewDesignImport,
} from "@/lib/api/designs";
import { getApiErrorMessage } from "@/lib/api/client";

type Props = {
  designId: string;
  disabled?: boolean;
  onApplied: () => void;
};

export default function DesignBomImport({
  designId,
  disabled,
  onApplied,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<DesignImportPreview | null>(null);
  const [rows, setRows] = useState<DesignImportRow[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);

  const handleFile = async (file: File) => {
    setError("");
    setLoading(true);
    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: "",
      }) as unknown[][];

      const result = await previewDesignImport(designId, data, sheetName);
      setPreview(result);
      setRows(result.rows.map((r) => ({ ...r })));
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to parse import file."));
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  const updateRowMotif = (index: number, motifId: string) => {
    setRows((prev) =>
      prev.map((row, i) => {
        if (i !== index) return row;
        const motif = row.suggestedMotifs.find((m) => m.id === motifId);
        return {
          ...row,
          matchedMotifId: motifId || undefined,
          matchedMotifName: motif?.name,
          matchConfidence: motifId ? "exact" : "none",
        };
      }),
    );
  };

  const handleApply = async () => {
    setApplying(true);
    setError("");
    try {
      const confirmed: ConfirmedDesignImportRow[] = rows.map((row) => ({
        elementName: row.elementName,
        qtyPerSet: row.qtyPerSet,
        motifId: row.matchedMotifId,
        type: row.matchedMotifId ? "Motif" : "Stone",
      }));
      await applyDesignImport(designId, confirmed, "Excel BOM import");
      setPreview(null);
      setRows([]);
      onApplied();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to apply import."));
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="surface-card rounded-xl p-5 space-y-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-700">Import BOM from Excel</h2>
        <p className="text-xs text-zinc-500 mt-1">
          Columns: S.no, Element, 1 set qty, total qty pcs. Element text is matched
          to motif names (fuzzy). Unmatched rows import as Stone elements.
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />

      <button
        type="button"
        disabled={disabled || loading}
        onClick={() => inputRef.current?.click()}
        className="btn-secondary px-4 py-2 text-sm"
      >
        {loading ? "Parsing…" : "Choose Excel file"}
      </button>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {preview && (
        <div className="border border-zinc-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-zinc-50 border-b border-zinc-200 text-xs space-y-1">
            <p>
              Sheet: <strong>{preview.sheetName}</strong> · Code:{" "}
              <strong>{preview.designCode}</strong>
              {preview.codeMismatch && (
                <span className="text-amber-700 ml-2">(sheet/code mismatch)</span>
              )}
            </p>
            {preview.warnings.map((w, i) => (
              <p key={i} className="text-amber-700">
                {w}
              </p>
            ))}
          </div>

          <div className="max-h-64 overflow-y-auto">
            <table className="w-full text-xs">
              <thead className="bg-zinc-50 sticky top-0">
                <tr>
                  <th className="text-left px-3 py-2">Element</th>
                  <th className="text-right px-3 py-2">Qty/set</th>
                  <th className="text-left px-3 py-2">Motif match</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={index} className="border-t border-zinc-100">
                    <td className="px-3 py-2">{row.elementName}</td>
                    <td className="px-3 py-2 text-right">{row.qtyPerSet}</td>
                    <td className="px-3 py-2">
                      <select
                        value={row.matchedMotifId ?? ""}
                        onChange={(e) => updateRowMotif(index, e.target.value)}
                        className="input-field w-full px-2 py-1"
                        disabled={disabled}
                      >
                        <option value="">— Stone (no motif) —</option>
                        {row.suggestedMotifs.map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({Math.round(m.score * 100)}%)
                          </option>
                        ))}
                      </select>
                      {row.matchConfidence === "fuzzy" && row.matchedMotifId && (
                        <span className="text-amber-600 block mt-0.5">
                          Fuzzy match — confirm
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="px-4 py-3 border-t border-zinc-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                setPreview(null);
                setRows([]);
              }}
              className="btn-secondary px-3 py-1.5 text-xs"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={disabled || applying}
              onClick={() => void handleApply()}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              {applying ? "Applying…" : "Apply import"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
