"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import type { InventoryItem } from "@/lib/types";

type AddUnitsSkuPickerModalProps = {
  open: boolean;
  items: InventoryItem[];
  onClose: () => void;
  onSelect: (product: InventoryItem) => void;
};

export default function AddUnitsSkuPickerModal({
  open,
  items,
  onClose,
  onSelect,
}: AddUnitsSkuPickerModalProps) {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState("");

  const options = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!needle) return true;
      return (
        item.sku.toLowerCase().includes(needle) ||
        item.name.toLowerCase().includes(needle)
      );
    });
  }, [items, search]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative w-full max-w-md rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-900">
            Add Units to SKU
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:text-zinc-600"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-3 p-5">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU or product name…"
            className="input-field w-full px-3 py-2 text-sm"
            autoFocus
          />
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            className="input-field w-full px-3 py-2 text-sm"
            size={Math.min(8, Math.max(4, options.length))}
          >
            <option value="" disabled>
              Select a SKU…
            </option>
            {options.map((item) => (
              <option key={item.id} value={item.id}>
                {item.sku} — {item.name} ({item.stock} in stock)
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={onClose} className="btn-secondary px-4 py-2 text-sm">
              Cancel
            </button>
            <button
              type="button"
              disabled={!selectedId}
              onClick={() => {
                const product = items.find((item) => item.id === selectedId);
                if (product) onSelect(product);
              }}
              className="btn-primary px-4 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
