import type { ProductionRun, ProductionRunStage } from "@/lib/types";

const PRISMA_TO_API: Record<string, ProductionRunStage> = {
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

export const normalizeProductionRunStage = (
  stage: string,
): ProductionRunStage => (PRISMA_TO_API[stage] ?? stage) as ProductionRunStage;

export const normalizeProductionRun = (run: ProductionRun): ProductionRun => ({
  ...run,
  currentStage: normalizeProductionRunStage(run.currentStage),
  stageLogs: run.stageLogs.map((log) => ({
    ...log,
    stage: normalizeProductionRunStage(log.stage),
  })),
});

export const normalizeProductionRunList = (runs: ProductionRun[]): ProductionRun[] =>
  runs.map(normalizeProductionRun);
