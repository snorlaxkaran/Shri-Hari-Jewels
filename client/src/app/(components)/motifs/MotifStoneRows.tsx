"use client";

import { Plus, Trash2 } from "lucide-react";
import type { MotifStoneInput, StoneType } from "@/lib/types";

type MotifStoneRow = MotifStoneInput & { key: string };

type Props = {
  stoneTypes: StoneType[];
  rows: MotifStoneRow[];
  onChange: (rows: MotifStoneRow[]) => void;
  disabled?: boolean;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function MotifStoneRows({
  stoneTypes,
  rows,
  onChange,
  disabled,
}: Props) {
  const addRow = () => {
    onChange([
      ...rows,
      {
        key: `stone-${Date.now()}`,
        stoneType: stoneTypes[0]?.name ?? "",
        qtyPerMotif: 1,
      },
    ]);
  };

  const updateRow = (key: string, patch: Partial<MotifStoneRow>) => {
    onChange(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };

  const removeRow = (key: string) => {
    onChange(rows.filter((r) => r.key !== key));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className={labelClass}>Stones in motif</label>
        {!disabled && (
          <button
            type="button"
            onClick={addRow}
            className="text-xs text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
          >
            <Plus size={14} /> Add stone
          </button>
        )}
      </div>

      {stoneTypes.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          No stone types yet. Add stone stock under Raw Materials first, or use + New
          when logging stock to seed types.
        </p>
      )}

      {rows.map((row) => (
        <div
          key={row.key}
          className="grid grid-cols-[1fr_100px_auto] gap-2 items-end"
        >
          <div>
            <label className={labelClass}>Stone type</label>
            <select
              value={row.stoneType}
              onChange={(e) => updateRow(row.key, { stoneType: e.target.value })}
              className={fieldClass}
              disabled={disabled || stoneTypes.length === 0}
            >
              <option value="">Select stone…</option>
              {stoneTypes.map((type) => (
                <option key={type.id} value={type.name}>
                  {type.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelClass}>Qty / motif</label>
            <input
              type="number"
              min={1}
              value={row.qtyPerMotif}
              onChange={(e) =>
                updateRow(row.key, {
                  qtyPerMotif: Math.max(1, parseInt(e.target.value, 10) || 1),
                })
              }
              className={fieldClass}
              disabled={disabled}
            />
          </div>
          <button
            type="button"
            onClick={() => removeRow(row.key)}
            disabled={disabled}
            className="p-2 text-zinc-400 hover:text-red-500"
            aria-label="Remove stone row"
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>
  );
}

export type { MotifStoneRow };
