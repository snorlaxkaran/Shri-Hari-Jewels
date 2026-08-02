"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { globalSearch, type SearchResult } from "@/lib/api/search";

const TYPE_LABELS: Record<SearchResult["type"], string> = {
  product: "Product",
  customer: "Customer",
  sale: "Sale",
  invoice: "Invoice",
  order: "Order",
  design: "Design",
  motif: "Motif",
  productionRun: "Production",
  workOrder: "Work order",
};

export default function GlobalSearch() {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const data = await globalSearch(value.trim());
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
        setOpen(false);
      }
    }, 280);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [value]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        wrapRef.current?.querySelector("input")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={wrapRef} className="global-search">
      <Search size={14} className="global-search-icon" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Search (Ctrl+K)…"
        className="global-search-input"
        aria-label="Global search"
      />
      {open && results.length > 0 ? (
        <div className="global-search-dropdown" role="listbox">
          {results.map((r) => (
            <button
              key={`${r.type}-${r.id}`}
              type="button"
              className="global-search-result"
              onMouseDown={() => {
                router.push(r.href);
                setOpen(false);
                setValue("");
              }}
            >
              <span className="global-search-result-label">{r.label}</span>
              <span className="global-search-result-meta">
                {TYPE_LABELS[r.type]}
                {r.sublabel ? ` · ${r.sublabel}` : ""}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
