import type {
  ProductionRun,
  ProductionRunItem,
  ProductionRunStage,
} from "@/lib/types";
import { getStageWorksheetConfig } from "./stage-config";

export const isItemStageDone = (
  item: ProductionRunItem,
  stage: ProductionRunStage,
): boolean => Boolean(item.stageCheckoffs?.[stage]);

export const getStageProgress = (
  run: ProductionRun,
  stage: ProductionRunStage,
): { done: number; total: number } => {
  const items = getStageItems(run, stage);
  return {
    done: items.filter((item) => isItemStageDone(item, stage)).length,
    total: items.length,
  };
};

export const getStageItems = (
  run: ProductionRun,
  stage: ProductionRunStage,
): ProductionRunItem[] => {
  const config = getStageWorksheetConfig(stage);
  if (config.mode === "stone-setting") {
    return run.items.filter(
      (item) => item.elementType === "Stone" || item.elementType === "Motif",
    );
  }
  return run.items;
};

export const formatElementWeight = (item: ProductionRunItem): string => {
  if (!item.weightGramsPerPc) return "—";
  const perSet = item.weightGramsPerPc * item.qtyPerSet;
  return `${item.weightGramsPerPc.toFixed(2)}g/pc · ${perSet.toFixed(2)}g/set`;
};
