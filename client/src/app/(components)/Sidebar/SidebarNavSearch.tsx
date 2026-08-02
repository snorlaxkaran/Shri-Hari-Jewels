"use client";

import Link from "next/link";
import { Search } from "lucide-react";
import type { NavItem, NavSection } from "@/lib/navigation";

export type NavMatch = {
  label: string;
  href: string;
  section?: string;
  icon?: React.ReactNode;
};

type SidebarNavSearchProps = {
  value: string;
  onChange: (value: string) => void;
};

export default function SidebarNavSearch({ value, onChange }: SidebarNavSearchProps) {
  return (
    <div className="sidebar-search-inner">
      <Search size={14} aria-hidden />
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Filter sidebar…"
        aria-label="Filter navigation"
      />
    </div>
  );
}

export function filterNavSectionsByQuery(
  sections: NavSection[],
  primaryItems: NavItem[],
  query: string,
  extras: NavItem[],
): { sections: NavSection[]; primaryItems: NavItem[]; extras: NavItem[] } {
  const q = query.trim().toLowerCase();
  if (!q) return { sections, primaryItems, extras };

  const match = (label: string) => label.toLowerCase().includes(q);

  return {
    primaryItems: primaryItems.filter((i) => match(i.label)),
    extras: extras.filter((i) => match(i.label)),
    sections: sections
      .map((s) => ({
        ...s,
        items: s.items.filter((i) => match(i.label) || match(s.title)),
      }))
      .filter((s) => s.items.length > 0 || match(s.title)),
  };
}

export function flattenNavMatches(
  sections: NavSection[],
  primaryItems: NavItem[],
  extras: NavItem[],
): NavMatch[] {
  const out: NavMatch[] = [];
  for (const item of primaryItems) {
    out.push({ label: item.label, href: item.href, icon: item.icon });
  }
  for (const item of extras) {
    out.push({ label: item.label, href: item.href, icon: item.icon });
  }
  for (const section of sections) {
    for (const item of section.items) {
      out.push({ label: item.label, href: item.href, section: section.title, icon: item.icon });
    }
  }
  return out;
}

export function rankNavMatches(matches: NavMatch[], query: string): NavMatch[] {
  const q = query.trim().toLowerCase();
  if (!q) return matches;
  return matches
    .filter((m) => m.label.toLowerCase().includes(q) || m.section?.toLowerCase().includes(q))
    .sort((a, b) => a.label.localeCompare(b.label));
}

type ResultsProps = {
  matches: NavMatch[];
  pathname: string;
  onNavigate: () => void;
  onClear: () => void;
};

export function SidebarNavSearchResults({
  matches,
  pathname,
  onNavigate,
  onClear,
}: ResultsProps) {
  if (matches.length === 0) {
    return (
      <div className="px-4 py-6 text-sm text-center" style={{ color: "var(--text-muted)" }}>
        No navigation matches.{" "}
        <button type="button" className="ws-dismiss-btn" onClick={onClear}>
          Clear
        </button>
      </div>
    );
  }

  return (
    <div className="px-2 pb-2">
      {matches.map((m) => {
        const active = pathname === m.href || pathname.startsWith(`${m.href}/`);
        return (
          <Link
            key={m.href}
            href={m.href}
            onClick={onNavigate}
            className="sidebar-nav-item w-full flex items-center text-left"
            data-active={active}
            style={{
              fontSize: 13,
              padding: "7px 12px",
              gap: 8,
              margin: "2px 8px",
              borderRadius: 7,
            }}
          >
            <span className="sidebar-nav-icon flex-shrink-0 w-[16px] flex justify-center">
              {m.icon}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block truncate">{m.label}</span>
              {m.section && (
                <span className="block text-[11px] truncate" style={{ color: "var(--text-muted)" }}>
                  {m.section}
                </span>
              )}
            </span>
          </Link>
        );
      })}
    </div>
  );
}
