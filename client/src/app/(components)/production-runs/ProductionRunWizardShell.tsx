"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  PRODUCTION_RUN_STEPS,
  type ProductionRunStepSlug,
  isProductionRunStepAccessible,
} from "@/lib/production-runs/stages";
import type { ProductionRun } from "@/lib/types";

type ProductionRunWizardShellProps = {
  run: ProductionRun;
  children: React.ReactNode;
};

export default function ProductionRunWizardShell({
  run,
  children,
}: ProductionRunWizardShellProps) {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").pop() as ProductionRunStepSlug;
  const completedStages = run.stageLogs.map((l) => l.stage);

  return (
    <div className="space-y-6">
      <Link
        href="/production-runs"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft size={16} />
        Back to production runs
      </Link>

      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Production Run
        </p>
        <h1 className="text-xl font-semibold text-zinc-900 mt-1">
          {run.runNo} — {run.designCode}
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          {run.setsOrdered} set{run.setsOrdered !== 1 ? "s" : ""} · Current:{" "}
          {run.currentStage}
        </p>
      </div>

      <nav className="flex flex-wrap gap-2">
        {PRODUCTION_RUN_STEPS.map((step, idx) => {
          const href = `/production-runs/${run.id}/${step.slug}`;
          const active = step.slug === currentSlug;
          const accessible = isProductionRunStepAccessible(
            run.currentStage,
            completedStages,
            step.stage,
          );

          return accessible ? (
            <Link
              key={step.slug}
              href={href}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : step.stage === run.currentStage
                    ? "bg-amber-50 text-amber-800 border-amber-200"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {idx + 1}. {step.label}
            </Link>
          ) : (
            <span
              key={step.slug}
              className="px-3 py-1.5 rounded-full text-xs font-medium border border-zinc-100 text-zinc-300"
            >
              {idx + 1}. {step.label}
            </span>
          );
        })}
      </nav>

      <div className="max-w-4xl">{children}</div>
    </div>
  );
}
