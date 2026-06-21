"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { overrideMarketRates } from "@/lib/api/market-rates";
import { getApiErrorMessage } from "@/lib/api/client";
import type { MarketRatesCurrent } from "@/lib/types";

type Props = {
  open: boolean;
  onClose: () => void;
  initial: MarketRatesCurrent;
  onSaved: (rates: MarketRatesCurrent) => void;
};

export default function MarketRateOverrideModal({
  open,
  onClose,
  initial,
  onSaved,
}: Props) {
  const [gold22k, setGold22k] = useState("");
  const [silver925, setSilver925] = useState("");
  const [goldPct, setGoldPct] = useState("");
  const [silverPct, setSilverPct] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setGold22k(String(initial.gold22k ?? ""));
    setSilver925(String(initial.silver925 ?? ""));
    setGoldPct(String(initial.goldMakingChargesPct));
    setSilverPct(String(initial.silverMakingChargesPct));
    setNote("");
    setError("");
  }, [open, initial]);

  if (!open) return null;

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      const updated = await overrideMarketRates({
        gold22k: Number(gold22k),
        silver925: Number(silver925),
        goldMakingChargesPct: Number(goldPct),
        silverMakingChargesPct: Number(silverPct),
        note: note.trim() || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save rates."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="surface-card w-full max-w-md p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-zinc-900">
            Set Metal Rates Manually
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-700"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs mb-1 block text-zinc-500">
              22K Gold Rate (₹/gram)
            </label>
            <input
              type="number"
              value={gold22k}
              onChange={(e) => setGold22k(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block text-zinc-500">
              925 Silver Rate (₹/gram)
            </label>
            <input
              type="number"
              value={silver925}
              onChange={(e) => setSilver925(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block text-zinc-500">
              Making Charges — Gold (%)
            </label>
            <input
              type="number"
              value={goldPct}
              onChange={(e) => setGoldPct(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block text-zinc-500">
              Making Charges — Silver (%)
            </label>
            <input
              type="number"
              value={silverPct}
              onChange={(e) => setSilverPct(e.target.value)}
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs mb-1 block text-zinc-500">
              Reason / Note
            </label>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Today's MCX rate"
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
          >
            {saving ? "Saving..." : "Save & Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
