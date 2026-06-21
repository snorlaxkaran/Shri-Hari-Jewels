import { ProductionRunStatusEnum } from "@prisma/client";
import { prisma } from "../db.js";
import { ProductionRunError } from "./errors.js";
import { CHECKOFF_STAGES, STAGE_WORKSHEET_CONFIG } from "./stage-config.js";
import {
  nextProductionRunStage,
  toApiProductionRunStage,
  toDbProductionRunStage,
  type CompleteProductionRunStageInput,
  type ProductionRunStage,
  type ProductionRunStageLog,
} from "./stages.js";

type Actor = { id: string; name: string };

const toStageLog = (row: {
  id: string;
  productionRunId: string;
  stage: string;
  notes: string | null;
  performedById: string | null;
  performedByName: string;
  createdAt: Date;
}): ProductionRunStageLog => ({
  id: row.id,
  productionRunId: row.productionRunId,
  stage: toApiProductionRunStage(row.stage as Parameters<typeof toApiProductionRunStage>[0]),
  notes: row.notes ?? undefined,
  performedById: row.performedById ?? undefined,
  performedByName: row.performedByName,
  createdAt: row.createdAt.toISOString(),
});

export const listProductionRunStageLogs = async (
  runId: string,
): Promise<ProductionRunStageLog[]> => {
  const logs = await prisma.productionRunStageLog.findMany({
    where: { productionRunId: runId },
    orderBy: { createdAt: "asc" },
  });
  return logs.map(toStageLog);
};

export const completeProductionRunStage = async (
  runId: string,
  stage: ProductionRunStage,
  input: CompleteProductionRunStageInput,
  actor: Actor,
): Promise<{
  currentStage: ProductionRunStage;
  stageLogs: ProductionRunStageLog[];
}> => {
  const run = await prisma.productionRun.findUnique({
    where: { id: runId },
    include: { items: true },
  });
  if (!run) throw new ProductionRunError("Production run not found.", 404);

  const current = toApiProductionRunStage(run.currentStage);
  if (current !== stage) {
    throw new ProductionRunError(
      `Complete "${current}" before advancing. Cannot skip to "${stage}".`,
      400,
    );
  }

  validateStageComplete(run, stage);

  const next = nextProductionRunStage(stage);
  const isLast = next === null;

  await prisma.$transaction(async (tx) => {
    await tx.productionRunStageLog.create({
      data: {
        productionRunId: runId,
        stage: toDbProductionRunStage(stage),
        notes: input.notes?.trim() || null,
        performedById: actor.id,
        performedByName: actor.name,
      },
    });

    await tx.productionRun.update({
      where: { id: runId },
      data: {
        currentStage: next
          ? toDbProductionRunStage(next)
          : run.currentStage,
        status: isLast
          ? ProductionRunStatusEnum.Completed
          : run.status === ProductionRunStatusEnum.Open
            ? ProductionRunStatusEnum.InProgress
            : run.status,
      },
    });
  });

  const logs = await listProductionRunStageLogs(runId);
  const updated = await prisma.productionRun.findUnique({ where: { id: runId } });
  return {
    currentStage: toApiProductionRunStage(updated!.currentStage),
    stageLogs: logs,
  };
};

const parseStageCheckoffs = (
  value: unknown,
): Partial<Record<ProductionRunStage, boolean>> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: Partial<Record<ProductionRunStage, boolean>> = {};
  for (const [key, done] of Object.entries(value as Record<string, unknown>)) {
    if (typeof done === "boolean") {
      out[key as ProductionRunStage] = done;
    }
  }
  return out;
};

const validateStageComplete = (
  run: {
    items: Array<{
      elementType: string;
      waxCount: number | null;
      castingReceived: boolean;
      czStones: number | null;
      czWeight: number | null;
      stageCheckoffs?: unknown;
    }>;
  },
  stage: ProductionRunStage,
): void => {
  switch (stage) {
    case "Wax Pattern": {
      if (run.items.length === 0) break;
      const needsWax = run.items.filter((i) => i.elementType !== "Stone");
      if (
        needsWax.length > 0 &&
        needsWax.some((i) => i.waxCount == null || i.waxCount < 0)
      ) {
        throw new ProductionRunError(
          "Enter wax mould counts for all elements before continuing.",
        );
      }
      break;
    }
    case "Casting": {
      const castingItems = run.items.filter((i) => i.elementType === "Casting");
      if (castingItems.some((i) => !i.castingReceived)) {
        throw new ProductionRunError(
          "Mark all casting elements as received before continuing.",
        );
      }
      break;
    }
    case "Stone Setting": {
      const stoneItems = run.items.filter(
        (i) => i.elementType === "Stone" || i.elementType === "Motif",
      );
      if (
        stoneItems.some(
          (i) =>
            (i.czStones == null || i.czStones < 0) &&
            (i.czWeight == null || i.czWeight <= 0),
        )
      ) {
        throw new ProductionRunError(
          "Enter CZ stone counts or weights for all stone/motif elements before continuing.",
        );
      }
      break;
    }
    default: {
      if (!CHECKOFF_STAGES.includes(stage)) break;
      const config = STAGE_WORKSHEET_CONFIG[stage];
      if (config.mode !== "checkoff" || !config.checkoffStage) break;
      if (
        run.items.some(
          (item) => !parseStageCheckoffs(item.stageCheckoffs)[config.checkoffStage!],
        )
      ) {
        throw new ProductionRunError(
          `Mark all elements complete for ${stage} before continuing.`,
        );
      }
      break;
    }
  }
};

export const isStageAccessible = (
  currentStage: ProductionRunStage,
  targetStage: ProductionRunStage,
  completedStages: ProductionRunStage[],
): boolean => {
  if (targetStage === currentStage) return true;
  return completedStages.includes(targetStage);
};

export const getCompletedStages = (
  logs: ProductionRunStageLog[],
): ProductionRunStage[] => logs.map((l) => l.stage);
