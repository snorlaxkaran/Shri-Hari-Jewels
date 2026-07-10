"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { InventoryItem } from "@/lib/types";

const fieldClass = "input-field w-full px-3 py-2 text-sm";

type AddUnitsSkuPickerFormProps = {
  items: InventoryItem[];
  cancelHref: string;
  onSelect: (product: InventoryItem) => void;
};

export default function AddUnitsSkuPickerForm({
  items,
  cancelHref,
  onSelect,
}: AddUnitsSkuPickerFormProps) {
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="surface-card p-5 space-y-4">
        <p className="text-sm text-zinc-600">
          Choose an existing SKU to add more inventory units. New units will be created as
          inactive until verified on the Entry Verification dashboard.
        </p>
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search SKU or product name…"
          className={fieldClass}
          autoFocus
        />
        <select
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          className={fieldClass}
          size={Math.min(10, Math.max(4, options.length))}
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
        {options.length === 0 && (
          <p className="text-xs text-zinc-400">No SKUs match your search.</p>
        )}
      </div>

      <div className="flex gap-3">
        <Link href={cancelHref} className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center">
          Cancel
        </Link>
        <button
          type="button"
          disabled={!selectedId}
          onClick={() => {
            const product = items.find((item) => item.id === selectedId);
            if (product) onSelect(product);
          }}
          className="btn-primary flex-1 px-4 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          Continue
        </button>
      </div>
    </div>
  );
}
