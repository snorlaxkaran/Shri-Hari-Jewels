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

const DB_TO_API: Record<DbProductionRunStage, ProductionRunStage> = {
  WaxPattern: "Wax Pattern",
  Casting: "Casting",
  Cleaning: "Cleaning",
  Assembly: "Assembly",
  Prepolish: "Prepolish",
  StoneSetting: "Stone Setting",
  FinalPolishing: "Final Polishing",
  Plating: "Plating",
  QualityCheck: "Quality Check",
  Packaging: "Packaging",
};

const API_TO_DB = Object.fromEntries(
  Object.entries(DB_TO_API).map(([db, api]) => [api, db]),
) as Record<ProductionRunStage, DbProductionRunStage>;

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

export const stageIndex = (stage: ProductionRunStage): number =>
  PRODUCTION_RUN_STAGES.indexOf(stage);

export const isStageBefore = (
  earlier: ProductionRunStage,
  later: ProductionRunStage,
): boolean => stageIndex(earlier) < stageIndex(later);

export const getEarlierStages = (
  stage: ProductionRunStage,
): ProductionRunStage[] => {
  const idx = stageIndex(stage);
  if (idx <= 0) return [];
  return PRODUCTION_RUN_STAGES.slice(0, idx);
};

export const toApiProductionRunStage = (
  stage: DbProductionRunStage,
): ProductionRunStage => DB_TO_API[stage];

export const toDbProductionRunStage = (
  stage: ProductionRunStage,
): DbProductionRunStage => API_TO_DB[stage];

export type StageLogAction = "Started" | "Completed" | "Rejected";

export type ProductionRunStageLog = {
  id: string;
  productionRunId: string;
  stage: ProductionRunStage;
  action: StageLogAction;
  karigarName?: string;
  notes?: string;
  rejectionReason?: string;
  rejectedToStage?: ProductionRunStage;
  performedById?: string;
  performedByName: string;
  createdAt: string;
};

export type CompleteProductionRunStageInput = {
  karigarName: string;
  notes?: string;
};

export type RejectProductionRunStageInput = {
  rejectedToStage: ProductionRunStage;
  reason: string;
  karigarName?: string;
};
