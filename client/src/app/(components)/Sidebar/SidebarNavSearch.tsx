"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { NavItem, NavSection } from "@/lib/navigation";

export type FlatNavMatch = {
  label: string;
  href: string;
  sectionTitle?: string;
};

const navItemMatches = (label: string, sectionTitle: string | undefined, query: string) => {
  const q = query.toLowerCase();
  return (
    label.toLowerCase().includes(q) ||
    (sectionTitle?.toLowerCase().includes(q) ?? false)
  );
};

export function flattenNavMatches(
  sections: NavSection[],
  primaryItems: NavItem[],
  extras: NavItem[] = [],
): FlatNavMatch[] {
  const out: FlatNavMatch[] = [];

  for (const item of primaryItems) {
    out.push({ label: item.label, href: item.href });
  }
  for (const item of extras) {
    out.push({ label: item.label, href: item.href, sectionTitle: "System" });
  }
  for (const section of sections) {
    for (const item of section.items) {
      out.push({ label: item.label, href: item.href, sectionTitle: section.title });
    }
  }

  return out;
}

export function filterNavSectionsByQuery(
  sections: NavSection[],
  primaryItems: NavItem[],
  query: string,
  extras: NavItem[] = [],
): {
  sections: NavSection[];
  primaryItems: NavItem[];
  extras: NavItem[];
} {
  const q = query.trim();
  if (!q) {
    return { sections, primaryItems, extras };
  }

  const filteredPrimary = primaryItems.filter((item) =>
    navItemMatches(item.label, undefined, q),
  );
  const filteredExtras = extras.filter((item) =>
    navItemMatches(item.label, "System", q),
  );
  const filteredSections = sections
    .map((section) => ({
      ...section,
      items: section.items.filter((item) =>
        navItemMatches(item.label, section.title, q),
      ),
    }))
    .filter((section) => section.items.length > 0);

  return {
    sections: filteredSections,
    primaryItems: filteredPrimary,
    extras: filteredExtras,
  };
}

export function rankNavMatches(items: FlatNavMatch[], query: string): FlatNavMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matched = items.filter((item) =>
    navItemMatches(item.label, item.sectionTitle, q),
  );

  return matched.sort((a, b) => {
    const aLabel = a.label.toLowerCase();
    const bLabel = b.label.toLowerCase();
    const aStarts = aLabel.startsWith(q) ? 0 : 1;
    const bStarts = bLabel.startsWith(q) ? 0 : 1;
    if (aStarts !== bStarts) return aStarts - bStarts;
    return aLabel.localeCompare(bLabel);
  });
}

type SidebarNavSearchProps = {
  value: string;
  onChange: (value: string) => void;
  matches: FlatNavMatch[];
  onNavigate?: () => void;
};

export default function SidebarNavSearch({
  value,
  onChange,
  matches,
  onNavigate,
}: SidebarNavSearchProps) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const showDropdown = open && value.trim().length > 0;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "/") {
        e.preventDefault();
        wrapRef.current?.querySelector("input")?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div ref={wrapRef} className="sidebar-nav-search">
      <Search size={14} className="sidebar-nav-search-icon" aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => value.trim() && setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Filter menu…"
        className="sidebar-nav-search-input"
        aria-label="Filter sidebar menu"
        aria-expanded={showDropdown}
        aria-controls="sidebar-nav-search-results"
      />
      {showDropdown ? (
        <div
          id="sidebar-nav-search-results"
          className="sidebar-nav-search-dropdown"
          role="listbox"
        >
          {matches.length === 0 ? (
            <p className="sidebar-nav-search-empty">No menu items match.</p>
          ) : (
            matches.map((match) => (
              <Link
                key={match.href}
                href={match.href}
                role="option"
                className="sidebar-nav-search-result"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onChange("");
                  setOpen(false);
                  onNavigate?.();
                }}
              >
                <span className="sidebar-nav-search-result-label">{match.label}</span>
                {match.sectionTitle ? (
                  <span className="sidebar-nav-search-result-meta">{match.sectionTitle}</span>
                ) : null}
              </Link>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
