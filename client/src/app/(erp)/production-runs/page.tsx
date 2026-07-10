"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import FilterPill from "@/app/(components)/ui/FilterPill";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageProductionRuns } from "@/lib/auth/permissions";
import { useProductionRuns } from "@/lib/production-runs/production-runs-context";
import { stageToProductionRunSlug } from "@/lib/production-runs/stages";
import type { ProductionRun, ProductionRunStatus } from "@/lib/types";
import { formatDate } from "@/lib/format";

const statuses: (ProductionRunStatus | "All")[] = [
  "All",
  "Open",
  "In Progress",
  "Completed",
  "Cancelled",
];

function ProgressBar({
  received,
  total,
}: {
  received: number;
  total: number;
}) {
  const pct = total > 0 ? Math.round((received / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2 min-w-[120px]">
      <div className="flex-1 h-2 rounded-full bg-zinc-100 overflow-hidden">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-zinc-500 whitespace-nowrap">
        {received}/{total}
      </span>
    </div>
  );
}

function ProductionRunSummaryCard({ run }: { run: ProductionRun }) {
  const href =
    run.status === "Completed" || run.status === "Cancelled"
      ? `/production-runs/${run.id}`
      : `/production-runs/${run.id}/${stageToProductionRunSlug(run.currentStage) ?? "wax-pattern"}`;

  return (
    <Link
      href={href}
      className="surface-card block px-5 py-4 hover:border-zinc-300 transition-colors"
    >
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-zinc-900">{run.runNo}</span>
            <span className="text-sm text-zinc-600">{run.designCode}</span>
            {run.designName && (
              <span className="text-sm text-zinc-400">— {run.designName}</span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-zinc-400">
            <span>
              {run.setsOrdered} set{run.setsOrdered !== 1 ? "s" : ""} ordered
            </span>
            <span>Created {formatDate(run.createdAt)}</span>
          </div>
        </div>

        <span className="text-xs px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">
          {run.status}
        </span>

        {run.status !== "Completed" && run.status !== "Cancelled" && (
          <span className="text-xs px-2 py-1 rounded-full bg-amber-50 text-amber-800">
            {run.currentStage}
          </span>
        )}

        <ProgressBar
          received={run.castingsReceived}
          total={run.castingsTotal}
        />

        {run.finishedGoodsProductId && (
          <span className="text-xs px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
            In inventory
          </span>
        )}
      </div>
    </Link>
  );
}

export default function ProductionRunsPage() {
  const { user } = useAuth();
  const canManage = user ? canManageProductionRuns(user.role) : false;
  const {
    productionRuns,
    hydrated,
    loading,
    error,
  } = useProductionRuns();
  const [statusFilter, setStatusFilter] = useState<
    ProductionRunStatus | "All"
  >("All");

  const filtered = useMemo(
    () =>
      productionRuns.filter(
        (run) => statusFilter === "All" || run.status === statusFilter,
      ),
    [productionRuns, statusFilter],
  );

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  return (
    <div>
      <PageHeader
        title="Production Runs"
        subtitle="Track casting, wax moulds, and stone usage per order"
        action={
          canManage ? (
            <Link
              href="/production-runs/new"
              className="btn-primary flex items-center gap-2 px-4 py-2 text-sm"
            >
              <Plus size={16} />
              New Run
            </Link>
          ) : undefined
        }
      />

      <div className="flex flex-wrap gap-2 mb-4">
        {statuses.map((status) => (
          <FilterPill
            key={status}
            label={status}
            active={statusFilter === status}
            onClick={() => setStatusFilter(status)}
          />
        ))}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="surface-card px-5 py-8 text-center">
          <p className="text-sm text-zinc-400">
            {productionRuns.length === 0
              ? "No production runs yet. Start a run from a design."
              : "No runs match this filter."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((run) => (
            <ProductionRunSummaryCard key={run.id} run={run} />
          ))}
        </div>
      )}
    </div>
  );
}
