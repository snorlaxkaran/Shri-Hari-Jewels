"use client";

import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import { canManageStockAudit } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";
import type { StockAuditMetalGroup } from "@/lib/types";

const METAL_OPTIONS: Array<{
  group: StockAuditMetalGroup;
  label: string;
  description: string;
  href: string;
  accent: string;
}> = [
  {
    group: "Gold",
    label: "Gold",
    description: "Count gold and rose gold pieces at your branch.",
    href: "/inventory/audit/gold",
    accent: "border-amber-200 bg-amber-50 hover:bg-amber-100/80",
  },
  {
    group: "Silver",
    label: "Silver",
    description: "Count silver pieces only — gold items will be rejected.",
    href: "/inventory/audit/silver",
    accent: "border-zinc-200 bg-zinc-50 hover:bg-zinc-100/80",
  },
  {
    group: "Alloy",
    label: "Alloy",
    description: "Count base metal / alloy pieces at your branch.",
    href: "/inventory/audit/alloy",
    accent: "border-slate-200 bg-slate-50 hover:bg-slate-100/80",
  },
];

export default function StockAuditPage() {
  const { user } = useAuth();
  const canManage = user ? canManageStockAudit(user.role) : false;

  return (
    <div className="page-content">
      <PageHeader
        title="Stock audit"
        subtitle="Choose a metal to start or continue a physical stock count"
      />

      <div className="grid gap-4 md:grid-cols-3">
        {METAL_OPTIONS.map((option) => (
          <Link
            key={option.group}
            href={option.href}
            className={`surface-card block border p-6 transition-colors ${option.accent}`}
          >
            <div className="mb-4 inline-flex rounded-lg bg-white/80 p-2 text-zinc-700">
              <ClipboardCheck size={22} />
            </div>
            <h2 className="text-lg font-semibold text-zinc-900">{option.label}</h2>
            <p className="mt-2 text-sm text-zinc-600">{option.description}</p>
            <p className="mt-4 text-sm font-medium text-zinc-800">
              {canManage ? "Open audit →" : "View audits →"}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
