"use client";

import { Plus, Trash2 } from "lucide-react";
import type { BulkStoneLot, MotifStoneInput } from "@/lib/types";

type MotifStoneRow = MotifStoneInput & { key: string };

type Props = {
  lots: BulkStoneLot[];
  rows: MotifStoneRow[];
  onChange: (rows: MotifStoneRow[]) => void;
  disabled?: boolean;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function MotifStoneRows({
  lots,
  rows,
  onChange,
  disabled,
}: Props) {
  const addRow = () => {
    onChange([
      ...rows,
      {
        key: `stone-${Date.now()}`,
        bulkStoneLotId: lots[0]?.id ?? "",
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
        {canAdd(disabled, lots) && (
          <button
            type="button"
            onClick={addRow}
            className="text-xs text-amber-700 hover:text-amber-900 inline-flex items-center gap-1"
          >
            <Plus size={14} /> Add stone
          </button>
        )}
      </div>

      {lots.length === 0 && (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          No bulk stone lots yet. Add lots under Bulk Stone Lots before linking stones to motifs.
        </p>
      )}

      {rows.map((row) => {
        const lot = lots.find((l) => l.id === row.bulkStoneLotId);
        const lineCost =
          lot != null ? lot.pricePerStone * row.qtyPerMotif : undefined;

        return (
          <div
            key={row.key}
            className="grid grid-cols-[1fr_100px_100px_auto] gap-2 items-end"
          >
            <div>
              <label className={labelClass}>Bulk stone lot</label>
              <select
                value={row.bulkStoneLotId}
                onChange={(e) =>
                  updateRow(row.key, { bulkStoneLotId: e.target.value })
                }
                className={fieldClass}
                disabled={disabled || lots.length === 0}
              >
                <option value="">Select lot…</option>
                {lots.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.sizeLabel} ({l.stoneType}) — ₹{l.pricePerStone}/pc ·{" "}
                    {l.quantity} on hand
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
            <div>
              <label className={labelClass}>Line cost</label>
              <div className="text-sm text-zinc-600 py-2">
                {lineCost != null ? `₹${lineCost.toLocaleString("en-IN")}` : "—"}
              </div>
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
        );
      })}
    </div>
  );
}

const canAdd = (disabled?: boolean, lots?: BulkStoneLot[]) =>
  !disabled && (lots?.length ?? 0) > 0;

export type { MotifStoneRow };
