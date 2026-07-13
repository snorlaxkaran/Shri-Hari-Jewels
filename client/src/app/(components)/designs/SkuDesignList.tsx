"use client";

import { useMemo, useState } from "react";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import type { Design, DesignApprovalStatus } from "@/lib/types";

const approvalBadgeClass = (status: DesignApprovalStatus = "Draft") => {
  switch (status) {
    case "Approved":
      return "bg-emerald-100 text-emerald-700";
    case "PendingApproval":
      return "bg-amber-100 text-amber-800";
    case "Rejected":
      return "bg-red-100 text-red-700";
    default:
      return "bg-zinc-100 text-zinc-600";
  }
};

const approvalLabel = (status: DesignApprovalStatus = "Draft") => {
  if (status === "PendingApproval") return "Pending";
  return status;
};

type SkuDesignListProps = {
  designs: Design[];
  selectedId: string | null;
  onSelect: (design: Design) => void;
};

export default function SkuDesignList({
  designs,
  selectedId,
  onSelect,
}: SkuDesignListProps) {
  const [query, setQuery] = useState("");

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

  return (
    <section className="surface-card rounded-xl overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-zinc-200">
        <div className="relative flex-1 min-w-[220px]">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
          />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SKU, name, category…"
            className="input-field w-full pl-9 pr-3 py-2 text-sm"
          />
        </div>
        <Link
          href="/designs/new"
          className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
        >
          <Plus size={16} />
          New design
        </Link>
      </div>

      {filtered.length === 0 ? (
        <div className="px-5 py-10 text-center text-sm text-zinc-500">
          {designs.length === 0
            ? "No SKUs yet. Click New design to create one."
            : "No SKUs match your search."}
        </div>
      ) : (
        <div className="divide-y divide-zinc-100 max-h-[420px] overflow-y-auto">
          {filtered.map((design) => {
            const selected = design.id === selectedId;
            return (
              <button
                key={design.id}
                type="button"
                onClick={() => onSelect(design)}
                className={`w-full px-5 py-3 text-left transition-colors hover:bg-zinc-50 ${
                  selected ? "bg-blue-50 hover:bg-blue-50" : ""
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-semibold text-zinc-900">{design.code}</p>
                    {design.name && (
                      <p className="text-sm text-zinc-600">{design.name}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2 text-[11px]">
                    {design.category && (
                      <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                        {design.category}
                      </span>
                    )}
                    <span className="px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
                      {design.elements.length} element
                      {design.elements.length !== 1 ? "s" : ""}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full ${approvalBadgeClass(design.approvalStatus)}`}
                    >
                      {approvalLabel(design.approvalStatus)}
                    </span>
                    <span
                      className={`px-2 py-1 rounded-full ${
                        design.builderStage === "Complete"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {design.builderStage}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}
