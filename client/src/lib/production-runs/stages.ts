import type { ProductionRunStage } from "@/lib/types";

export const PRODUCTION_RUN_STEPS = [
  { slug: "wax-pattern", label: "Wax Pattern", stage: "Wax Pattern" as ProductionRunStage },
  { slug: "casting", label: "Casting", stage: "Casting" as ProductionRunStage },
  { slug: "cleaning", label: "Cleaning / Sprue Cutting", stage: "Cleaning" as ProductionRunStage },
  { slug: "assembly", label: "Assembly / Soldering / Filing", stage: "Assembly" as ProductionRunStage },
  { slug: "prepolish", label: "Prepolish", stage: "Prepolish" as ProductionRunStage },
  { slug: "stone-setting", label: "Stone Setting", stage: "Stone Setting" as ProductionRunStage },
  { slug: "final-polishing", label: "Final Polishing", stage: "Final Polishing" as ProductionRunStage },
  { slug: "plating", label: "Plating", stage: "Plating" as ProductionRunStage },
  { slug: "quality-check", label: "Quality Check", stage: "Quality Check" as ProductionRunStage },
  { slug: "packaging", label: "Packaging", stage: "Packaging" as ProductionRunStage },
] as const;

export const PRODUCTION_RUN_STAGES = PRODUCTION_RUN_STEPS.map(
  (s) => s.stage,
) as ProductionRunStage[];

export type ProductionRunStepSlug = (typeof PRODUCTION_RUN_STEPS)[number]["slug"];

export const productionRunStepHref = (runId: string, slug: ProductionRunStepSlug) =>
  `/production-runs/${runId}/${slug}`;

export const slugToProductionRunStage = (
  slug: string,
): ProductionRunStage | null =>
  PRODUCTION_RUN_STEPS.find((s) => s.slug === slug)?.stage ?? null;

export const stageToProductionRunSlug = (
  stage: ProductionRunStage,
): ProductionRunStepSlug | null =>
  PRODUCTION_RUN_STEPS.find((s) => s.stage === stage)?.slug ?? null;

export const isProductionRunStepAccessible = (
  currentStage: ProductionRunStage,
  completedStages: ProductionRunStage[],
  targetStage: ProductionRunStage,
): boolean => {
  if (targetStage === currentStage) return true;
  return completedStages.includes(targetStage);
};

export const isProductionRunStepCurrent = (
  currentStage: ProductionRunStage,
  targetStage: ProductionRunStage,
): boolean => currentStage === targetStage;
