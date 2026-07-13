"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { useProductionRuns } from "@/lib/production-runs/production-runs-context";
import {
  PRODUCTION_RUN_STAGES,
  stageToProductionRunSlug,
} from "@/lib/production-runs/stages";
import type { ProductionRun, ProductionRunStage } from "@/lib/types";

const DELAY_DAYS = 3;

function getStageEnteredAt(run: ProductionRun): Date {
  const idx = PRODUCTION_RUN_STAGES.indexOf(run.currentStage);
  for (let i = run.stageLogs.length - 1; i >= 0; i--) {
    const log = run.stageLogs[i]!;
    if (log.action === "Rejected" && log.rejectedToStage === run.currentStage) {
      return new Date(log.createdAt);
    }
    if (log.action === "Completed" || !log.action) {
      const logIdx = PRODUCTION_RUN_STAGES.indexOf(log.stage);
      if (logIdx >= 0 && logIdx + 1 === idx) {
        return new Date(log.createdAt);
      }
      if (idx === 0 && log.stage === run.currentStage) {
        return new Date(log.createdAt);
      }
    }
  }
  return new Date(run.createdAt);
}

function daysInStage(run: ProductionRun): number {
  const entered = getStageEnteredAt(run);
  return Math.floor((Date.now() - entered.getTime()) / (1000 * 60 * 60 * 24));
}

function currentKarigar(run: ProductionRun): string | undefined {
  for (let i = run.stageLogs.length - 1; i >= 0; i--) {
    const log = run.stageLogs[i]!;
    if (log.karigarName && log.stage === run.currentStage) return log.karigarName;
  }
  return undefined;
}

function RunCard({ run }: { run: ProductionRun }) {
  const days = daysInStage(run);
  const delayed = days > DELAY_DAYS;
  const karigar = currentKarigar(run);
  const slug = stageToProductionRunSlug(run.currentStage) ?? "wax-pattern";

  return (
    <Link
      href={`/production-runs/${run.id}/${slug}`}
      className={`block rounded-lg border px-3 py-2 text-sm hover:border-zinc-400 transition-colors ${
        delayed ? "border-red-300 bg-red-50" : "border-zinc-200 bg-white"
      }`}
    >
      <p className="font-semibold text-zinc-900">{run.runNo}</p>
      <p className="text-xs text-zinc-600 truncate">
        {run.designCode}
        {run.designName ? ` · ${run.designName}` : ""}
      </p>
      {karigar && (
        <p className="text-xs text-zinc-500 mt-1">Karigar: {karigar}</p>
      )}
      <p className={`text-xs mt-1 ${delayed ? "text-red-700 font-medium" : "text-zinc-400"}`}>
        {days} day{days !== 1 ? "s" : ""} in stage
      </p>
    </Link>
  );
}

export default function ProductionDashboardPage() {
  const { productionRuns, hydrated, loading } = useProductionRuns();

  const activeRuns = useMemo(
    () =>
      productionRuns.filter(
        (r) => r.status === "Open" || r.status === "In Progress",
      ),
    [productionRuns],
  );

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const delayed = activeRuns.filter((r) => daysInStage(r) > DELAY_DAYS).length;
    const completedThisMonth = productionRuns.filter(
      (r) =>
        r.status === "Completed" && new Date(r.updatedAt) >= monthStart,
    ).length;
    return {
      inProgress: activeRuns.length,
      delayed,
      onHold: 0,
      completedThisMonth,
    };
  }, [activeRuns, productionRuns]);

  const byStage = useMemo(() => {
    const map = new Map<ProductionRunStage, ProductionRun[]>();
    for (const stage of PRODUCTION_RUN_STAGES) map.set(stage, []);
    for (const run of activeRuns) {
      map.get(run.currentStage)?.push(run);
    }
    return map;
  }, [activeRuns]);

  if (!hydrated || loading) return <PageSkeleton />;

  return (
    <div className="page-content">
      <PageHeader
        title="Production Dashboard"
        subtitle="Jobs in progress by stage — delayed runs highlighted after 3 days"
        action={
          <Link href="/production-runs" className="btn-secondary px-4 py-2 text-sm">
            List view
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <div className="surface-card px-4 py-3">
          <p className="text-xs text-zinc-500">In progress</p>
          <p className="text-2xl font-semibold">{stats.inProgress}</p>
        </div>
        <div className="surface-card px-4 py-3">
          <p className="text-xs text-zinc-500">Delayed (&gt;{DELAY_DAYS}d)</p>
          <p className="text-2xl font-semibold text-red-600">{stats.delayed}</p>
        </div>
        <div className="surface-card px-4 py-3">
          <p className="text-xs text-zinc-500">On hold</p>
          <p className="text-2xl font-semibold">{stats.onHold}</p>
        </div>
        <div className="surface-card px-4 py-3">
          <p className="text-xs text-zinc-500">Completed this month</p>
          <p className="text-2xl font-semibold text-emerald-600">
            {stats.completedThisMonth}
          </p>
        </div>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-3 min-w-max">
          {PRODUCTION_RUN_STAGES.map((stage) => {
            const runs = byStage.get(stage) ?? [];
            return (
              <div
                key={stage}
                className="w-56 shrink-0 rounded-xl border border-zinc-200 bg-zinc-50/80"
              >
                <div className="px-3 py-2 border-b border-zinc-200 flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-zinc-700">{stage}</h3>
                  <span className="text-xs text-zinc-400">{runs.length}</span>
                </div>
                <div className="p-2 space-y-2 min-h-[120px] max-h-[420px] overflow-y-auto">
                  {runs.length === 0 ? (
                    <p className="text-xs text-zinc-400 px-1 py-4 text-center">—</p>
                  ) : (
                    runs.map((run) => <RunCard key={run.id} run={run} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
