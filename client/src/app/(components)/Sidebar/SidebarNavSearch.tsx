"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import type { NavItem, NavSection } from "@/lib/navigation";

export type FlatNavMatch = {
  label: string;
  href: string;
  sectionTitle?: string;
  icon?: React.ReactNode;
  badge?: string | number;
};

/** Match menu labels: word starts with query, or full label starts with query. */
export const navLabelMatches = (label: string, query: string): boolean => {
  const q = query.trim().toLowerCase();
  if (!q) return true;

  const labelLower = label.toLowerCase();
  if (labelLower.startsWith(q)) return true;

  const words = labelLower.split(/[\s/&\-–—]+/).filter(Boolean);
  return words.some((word) => word.startsWith(q));
};

export function flattenNavMatches(
  sections: NavSection[],
  primaryItems: NavItem[],
  extras: NavItem[] = [],
): FlatNavMatch[] {
  const out: FlatNavMatch[] = [];
  const seen = new Set<string>();

  const push = (item: FlatNavMatch) => {
    if (seen.has(item.href)) return;
    seen.add(item.href);
    out.push(item);
  };

  for (const item of primaryItems) {
    push({
      label: item.label,
      href: item.href,
      icon: item.icon,
      badge: item.badge,
    });
  }
  for (const item of extras) {
    push({
      label: item.label,
      href: item.href,
      sectionTitle: "System",
    });
  }
  for (const section of sections) {
    for (const item of section.items) {
      push({
        label: item.label,
        href: item.href,
        sectionTitle: section.title,
        icon: item.icon,
        badge: item.badge,
      });
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

  return {
    primaryItems: primaryItems.filter((item) => navLabelMatches(item.label, q)),
    extras: extras.filter((item) => navLabelMatches(item.label, q)),
    sections: sections
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => navLabelMatches(item.label, q)),
      }))
      .filter((section) => section.items.length > 0),
  };
}

export function rankNavMatches(items: FlatNavMatch[], query: string): FlatNavMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const matched = items.filter((item) => navLabelMatches(item.label, q));

  return matched.sort((a, b) => {
    const aLabel = a.label.toLowerCase();
    const bLabel = b.label.toLowerCase();
    const aExact = aLabel === q ? 0 : aLabel.startsWith(q) ? 1 : 2;
    const bExact = bLabel === q ? 0 : bLabel.startsWith(q) ? 1 : 2;
    if (aExact !== bExact) return aExact - bExact;
    return aLabel.localeCompare(bLabel);
  });
}

type SidebarNavSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SidebarNavSearch({
  value,
  onChange,
}: SidebarNavSearchProps) {
  const wrapRef = useRef<HTMLDivElement>(null);

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
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search menu…"
        className="sidebar-nav-search-input"
        aria-label="Search sidebar menu"
      />
      {value.trim() ? (
        <button
          type="button"
          className="sidebar-nav-search-clear"
          onClick={() => onChange("")}
          aria-label="Clear menu search"
        >
          ×
        </button>
      ) : null}
    </div>
  );
}

type SidebarNavSearchResultsProps = {
  matches: FlatNavMatch[];
  pathname: string;
  onNavigate: () => void;
  onClear: () => void;
};

export function SidebarNavSearchResults({
  matches,
  pathname,
  onNavigate,
  onClear,
}: SidebarNavSearchResultsProps) {
  if (matches.length === 0) {
    return (
      <p className="sidebar-nav-search-empty-list">No menu items match your search.</p>
    );
  }

  return (
    <ul className="sidebar-nav-search-results" role="listbox">
      {matches.map((match) => {
        const isActive =
          pathname === match.href || pathname.startsWith(`${match.href}/`);
        return (
          <li key={match.href}>
            <Link
              href={match.href}
              role="option"
              data-active={isActive}
              className="sidebar-nav-search-result-row"
              onClick={() => {
                onClear();
                onNavigate();
              }}
            >
              {match.icon ? (
                <span className="sidebar-nav-search-result-icon">{match.icon}</span>
              ) : null}
              <span className="sidebar-nav-search-result-text">
                <span className="sidebar-nav-search-result-label">{match.label}</span>
                {match.sectionTitle ? (
                  <span className="sidebar-nav-search-result-meta">{match.sectionTitle}</span>
                ) : null}
              </span>
              {match.badge !== undefined ? (
                <span className="sidebar-nav-search-result-badge">{match.badge}</span>
              ) : null}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
