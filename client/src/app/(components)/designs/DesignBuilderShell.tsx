"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  DESIGN_BUILDER_STEPS,
  type DesignBuilderStepSlug,
} from "@/lib/designs/builder-stages";
import type { Design } from "@/lib/types";

type DesignBuilderShellProps = {
  design: Design;
  children: React.ReactNode;
};

const STAGE_ORDER = ["SKU", "CAD", "Mold Making", "Motifs", "Photo", "Complete"] as const;

const isStepComplete = (stepStage: string, designStage: string): boolean => {
  const stepIdx = STAGE_ORDER.indexOf(stepStage as typeof STAGE_ORDER[number]);
  const currentIdx = STAGE_ORDER.indexOf(designStage as typeof STAGE_ORDER[number]);
  return stepIdx < currentIdx;
};

export default function DesignBuilderShell({
  design,
  children,
}: DesignBuilderShellProps) {
  const pathname = usePathname();
  const currentSlug = pathname.split("/").pop() as DesignBuilderStepSlug;

  return (
    <div className="space-y-6">
      <Link
        href={`/designs?selected=${design.id}`}
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft size={16} />
        Back to design
      </Link>

      <div>
        <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide">
          Design Builder
        </p>
        <h1 className="text-xl font-semibold text-zinc-900 mt-1">
          {design.code}
          {design.name ? ` — ${design.name}` : ""}
        </h1>
      </div>

      <nav className="flex flex-wrap gap-2">
        {DESIGN_BUILDER_STEPS.map((step, idx) => {
          const href = `/designs/${design.id}/builder/${step.slug}`;
          const active = step.slug === currentSlug;
          const stepIdx = DESIGN_BUILDER_STEPS.findIndex((s) => s.slug === step.slug);
          const currentIdx = DESIGN_BUILDER_STEPS.findIndex((s) => s.slug === currentSlug);
          const accessible = stepIdx <= currentIdx || design.builderStage === "Complete";
          const done = isStepComplete(step.stage, design.builderStage);

          return accessible ? (
            <Link
              key={step.slug}
              href={href}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                active
                  ? "bg-zinc-900 text-white border-zinc-900"
                  : done
                    ? "bg-green-50 text-green-700 border-green-200 hover:border-green-300"
                    : "bg-white text-zinc-600 border-zinc-200 hover:border-zinc-300"
              }`}
            >
              {done && !active ? "✓ " : `${idx + 1}. `}{step.label}
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

      <div className="max-w-3xl">{children}</div>
    </div>
  );
}
