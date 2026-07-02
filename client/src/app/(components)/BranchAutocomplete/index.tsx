"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { CustomerBranch } from "@/lib/types";

type BranchAutocompleteProps = {
  branches: CustomerBranch[];
  value: CustomerBranch | null;
  onChange: (branch: CustomerBranch | null) => void;
  disabled?: boolean;
  placeholder?: string;
  loading?: boolean;
  onQueryChange?: (query: string) => void;
};

const rankBranchMatch = (name: string, query: string): number => {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const lower = name.toLowerCase();
  if (!lower.includes(q)) return -1;

  let score = 1000 - lower.indexOf(q);
  if (lower.startsWith(q)) score += 500;
  if (lower.split(/\s+/).some((word) => word.startsWith(q))) score += 300;
  return score;
};

export default function BranchAutocomplete({
  branches,
  value,
  onChange,
  disabled = false,
  placeholder = "Search branch…",
  loading = false,
  onQueryChange,
}: BranchAutocompleteProps) {
  const listId = useId();
  const containerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (value) {
      setQuery(value.name);
    }
  }, [value]);

  useEffect(() => {
    onQueryChange?.(query);
  }, [query, onQueryChange]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
        if (value) setQuery(value.name);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return branches;

    return branches
      .map((branch) => ({ branch, score: rankBranchMatch(branch.name, q) }))
      .filter((entry) => entry.score >= 0)
      .sort(
        (a, b) =>
          b.score - a.score || a.branch.name.localeCompare(b.branch.name),
      )
      .map((entry) => entry.branch);
  }, [branches, query]);

  const handleInputChange = (next: string) => {
    setQuery(next);
    setOpen(true);
    if (value && next !== value.name) {
      onChange(null);
    }
  };

  const selectBranch = (branch: CustomerBranch) => {
    onChange(branch);
    setQuery(branch.name);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(event) => handleInputChange(event.target.value)}
          onFocus={() => setOpen(true)}
          disabled={disabled}
          placeholder={placeholder}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          className="input-field w-full px-3 py-2 pr-9 text-sm disabled:opacity-50"
        />
        <ChevronDown
          size={15}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
        />
      </div>

      {open && !disabled && (
        <ul
          id={listId}
          role="listbox"
          className="absolute z-20 mt-1 w-full max-h-56 overflow-y-auto rounded-lg border border-zinc-200 bg-white shadow-lg"
        >
          {loading ? (
            <li className="px-3 py-2.5 text-sm text-zinc-400">Loading…</li>
          ) : filtered.length === 0 ? (
            <li className="px-3 py-2.5 text-sm text-zinc-400">
              No branches match your search.
            </li>
          ) : (
            filtered.map((branch) => (
              <li key={branch.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={value?.id === branch.id}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => selectBranch(branch)}
                  className={`w-full text-left px-3 py-2.5 text-sm hover:bg-zinc-50 ${
                    value?.id === branch.id ? "bg-zinc-50 font-medium" : ""
                  }`}
                >
                  <span className="text-zinc-900">{branch.name}</span>
                  {(branch.city || branch.state) && (
                    <span className="block text-xs text-zinc-400 mt-0.5">
                      {[branch.city, branch.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
