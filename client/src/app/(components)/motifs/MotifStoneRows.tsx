"use client";

import { Plus, Trash2 } from "lucide-react";
import { formatStoneMasterLabel } from "@/lib/stones/materials";
import type { MotifStoneInput, StoneMaster } from "@/lib/types";

type MotifStoneRow = MotifStoneInput & { key: string };

type Props = {
  stones: StoneMaster[];
  rows: MotifStoneRow[];
  onChange: (rows: MotifStoneRow[]) => void;
  disabled?: boolean;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function MotifStoneRows({
  stones,
  rows,
  onChange,
  disabled,
}: Props) {
  const addRow = () => {
    onChange([
      ...rows,
      {
        key: `stone-${Date.now()}`,
        stoneMasterId: stones[0]?.id ?? "",
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
        {canAdd(disabled, stones) && (
          <button
            type="button"
            onClick={addRow}
            className="text-xs text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
          >
            <Plus size={14} /> Add stone
          </button>
        )}
      </div>

      {stones.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          No stone master entries yet. Add stones under Stone Master before linking them to motifs.
        </p>
      )}

      {rows.map((row) => {
        const stone = stones.find((s) => s.id === row.stoneMasterId);

        return (
          <div
            key={row.key}
            className="grid grid-cols-[1fr_100px_auto] gap-2 items-end"
          >
            <div>
              <label className={labelClass}>Stone type</label>
              <select
                value={row.stoneMasterId}
                onChange={(e) =>
                  updateRow(row.key, { stoneMasterId: e.target.value })
                }
                className={fieldClass}
                disabled={disabled || stones.length === 0}
              >
                <option value="">Select stone…</option>
                {stones.map((s) => (
                  <option key={s.id} value={s.id}>
                    {formatStoneMasterLabel(s)}
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
            {stone && (
              <p className="col-span-full text-xs text-zinc-500 -mt-1">
                {stone.stoneMaterial} · {stone.uom}
                {stone.unitWeightCt != null ? ` · ${stone.unitWeightCt} Ct/pc` : ""}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

const canAdd = (disabled?: boolean, stones?: StoneMaster[]) =>
  !disabled && (stones?.length ?? 0) > 0;

export type { MotifStoneRow };
