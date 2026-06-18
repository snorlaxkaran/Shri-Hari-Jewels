"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, Plus, Search } from "lucide-react";
import type { Design } from "@/lib/types";

type SkuSearchDropdownProps = {
  designs: Design[];
  selectedId: string | null;
  onSelect: (design: Design) => void;
  onCreateNew: () => void;
  disabled?: boolean;
};

export default function SkuSearchDropdown({
  designs,
  selectedId,
  onSelect,
  onCreateNew,
  disabled = false,
}: SkuSearchDropdownProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = designs.find((d) => d.id === selectedId);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return designs;
    return designs.filter(
      (d) =>
        d.code.toLowerCase().includes(q) ||
        d.name?.toLowerCase().includes(q) ||
        d.category?.toLowerCase().includes(q),
    );
  }, [designs, query]);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("pointerdown", onPointerDown);
    return () => window.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  const displayLabel = selected
    ? selected.name
      ? `${selected.code} — ${selected.name}`
      : selected.code
    : "SKU Name";

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((v) => !v)}
        className="surface-card w-full flex items-center gap-3 px-5 py-4 text-left rounded-xl border border-zinc-200 hover:border-zinc-300 transition-colors disabled:opacity-60"
      >
        <span
          className={`flex-1 text-lg font-semibold truncate ${
            selected ? "text-zinc-900" : "text-zinc-400"
          }`}
        >
          {displayLabel}
        </span>
        <ChevronDown
          size={22}
          className={`text-zinc-400 shrink-0 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {open && (
        <div
          className="absolute z-30 top-full left-0 right-0 mt-2 rounded-xl border border-zinc-200 bg-white shadow-lg overflow-hidden"
        >
          <div className="p-3 border-b border-zinc-100">
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
              />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search SKU, name, category…"
                className="input-field w-full pl-9 pr-3 py-2 text-sm"
                autoFocus
              />
            </div>
          </div>

          <ul className="max-h-64 overflow-y-auto py-1">
            {filtered.length === 0 && (
              <li className="px-4 py-3 text-sm text-zinc-400 text-center">
                No SKUs match your search
              </li>
            )}
            {filtered.map((design) => (
              <li key={design.id}>
                <button
                  type="button"
                  onClick={() => {
                    onSelect(design);
                    setOpen(false);
                    setQuery("");
                  }}
                  className={`w-full px-4 py-2.5 text-left hover:bg-zinc-50 transition-colors ${
                    design.id === selectedId ? "bg-blue-50" : ""
                  }`}
                >
                  <span className="font-medium text-zinc-900">{design.code}</span>
                  {design.name && (
                    <span className="text-zinc-500 ml-2">{design.name}</span>
                  )}
                  {design.category && (
                    <span className="text-xs text-zinc-400 ml-2">
                      {design.category}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setQuery("");
              onCreateNew();
            }}
            className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-blue-600 hover:bg-blue-50 border-t border-zinc-100"
          >
            <Plus size={16} />
            Create new SKU
          </button>
        </div>
      )}
    </div>
  );
}
