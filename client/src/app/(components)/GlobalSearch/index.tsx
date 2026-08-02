"use client";

import { Search } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessRoute } from "@/lib/auth/permissions";
import { globalSearch, type SearchResult } from "@/lib/api/search";
import { filterNavSections, primaryNavItems } from "@/lib/navigation";

type SearchHit =
  | { kind: "nav"; label: string; href: string; section?: string }
  | { kind: "record"; label: string; href: string; meta?: string };

export default function GlobalSearch() {
  const { user } = useAuth();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [recordHits, setRecordHits] = useState<SearchResult[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const navHits = useMemo((): SearchHit[] => {
    if (!user || !query.trim()) return [];
    const q = query.trim().toLowerCase();
    const sections = filterNavSections((href) => canAccessRoute(user.role, href));
    const flat: SearchHit[] = [];
    for (const item of primaryNavItems) {
      if (canAccessRoute(user.role, item.href) && item.label.toLowerCase().includes(q)) {
        flat.push({ kind: "nav", label: item.label, href: item.href });
      }
    }
    for (const section of sections) {
      for (const item of section.items) {
        if (item.label.toLowerCase().includes(q)) {
          flat.push({ kind: "nav", label: item.label, href: item.href, section: section.title });
        }
      }
    }
    return flat.slice(0, 5);
  }, [user, query]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim() || query.trim().length < 2) {
      setRecordHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      try {
        const results = await globalSearch(query.trim());
        setRecordHits(results.slice(0, 6));
      } catch {
        setRecordHits([]);
      }
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  const hits = useMemo((): SearchHit[] => {
    const records: SearchHit[] = recordHits.map((r) => ({
      kind: "record" as const,
      label: r.label,
      href: r.href,
      meta: r.sublabel ? `${r.type} · ${r.sublabel}` : r.type,
    }));
    return [...navHits, ...records].slice(0, 10);
  }, [navHits, recordHits]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        wrapRef.current?.querySelector("input")?.focus();
        setOpen(true);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (href: string) => {
      setQuery("");
      setOpen(false);
      setRecordHits([]);
      router.push(href);
    },
    [router],
  );

  return (
    <div ref={wrapRef} className="global-search-wrap">
      <div className="global-search-input-row">
        <Search size={14} className="global-search-icon-inline" />
        <input
          type="search"
          className="global-search-input"
          placeholder="Search or type a command"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          aria-label="Global search"
        />
        <kbd className="global-search-kbd">Ctrl+K</kbd>
      </div>
      {open && query.trim() && hits.length > 0 && (
        <div className="global-search-dropdown">
          {hits.map((hit) => (
            <button
              key={`${hit.kind}-${hit.href}-${hit.label}`}
              type="button"
              className="global-search-hit"
              onMouseDown={() => go(hit.href)}
            >
              <span>{hit.label}</span>
              {"section" in hit && hit.section && (
                <span className="global-search-hit-meta">{hit.section}</span>
              )}
              {hit.kind === "record" && hit.meta && (
                <span className="global-search-hit-meta">{hit.meta}</span>
              )}
            </button>
          ))}
        </div>
      )}
      {open && query.trim() && hits.length === 0 && (
        <div className="global-search-dropdown global-search-empty">
          No matches — try a SKU, customer name, or module
        </div>
      )}
    </div>
  );
}
