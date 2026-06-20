import {
  ProductionRunStage as DbProductionRunStage,
} from "@prisma/client";

export const PRODUCTION_RUN_STAGES = [
  "Wax Pattern",
  "Casting",
  "Cleaning",
  "Assembly",
  "Prepolish",
  "Stone Setting",
  "Final Polishing",
  "Plating",
  "Quality Check",
  "Packaging",
] as const;

export type ProductionRunStage = (typeof PRODUCTION_RUN_STAGES)[number];

export const PRODUCTION_RUN_STAGE_SLUGS = [
  "wax-pattern",
  "casting",
  "cleaning",
  "assembly",
  "prepolish",
  "stone-setting",
  "final-polishing",
  "plating",
  "quality-check",
  "packaging",
] as const;

export type ProductionRunStageSlug =
  (typeof PRODUCTION_RUN_STAGE_SLUGS)[number];

const SLUG_TO_STAGE: Record<ProductionRunStageSlug, ProductionRunStage> = {
  "wax-pattern": "Wax Pattern",
  casting: "Casting",
  cleaning: "Cleaning",
  assembly: "Assembly",
  prepolish: "Prepolish",
  "stone-setting": "Stone Setting",
  "final-polishing": "Final Polishing",
  plating: "Plating",
  "quality-check": "Quality Check",
  packaging: "Packaging",
};

export const stageToSlug = (
  stage: ProductionRunStage,
): ProductionRunStageSlug | null => {
  const entry = Object.entries(SLUG_TO_STAGE).find(([, s]) => s === stage);
  return entry ? (entry[0] as ProductionRunStageSlug) : null;
};

export const slugToStage = (slug: string): ProductionRunStage | null =>
  SLUG_TO_STAGE[slug as ProductionRunStageSlug] ?? null;

export const nextProductionRunStage = (
  stage: ProductionRunStage,
): ProductionRunStage | null => {
  const idx = PRODUCTION_RUN_STAGES.indexOf(stage);
  if (idx < 0 || idx >= PRODUCTION_RUN_STAGES.length - 1) return null;
  return PRODUCTION_RUN_STAGES[idx + 1];
};

export const toApiProductionRunStage = (
  stage: DbProductionRunStage,
): ProductionRunStage => stage as ProductionRunStage;

export const toDbProductionRunStage = (
  stage: ProductionRunStage,
): DbProductionRunStage => stage as DbProductionRunStage;

export type ProductionRunStageLog = {
  id: string;
  productionRunId: string;
  stage: ProductionRunStage;
  notes?: string;
  performedById?: string;
  performedByName: string;
  createdAt: string;
};

export type CompleteProductionRunStageInput = {
  notes?: string;
};
