import { ProductionRunStatusEnum } from "@prisma/client";
import { prisma } from "../db.js";
import { ProductionRunError } from "./errors.js";
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

const validateStageComplete = (
  run: {
    items: Array<{
      elementType: string;
      waxCount: number | null;
      castingReceived: boolean;
      czStones: number | null;
      czWeight: number | null;
    }>;
  },
  stage: ProductionRunStage,
): void => {
  switch (stage) {
    case "Wax Pattern": {
      const castingItems = run.items.filter((i) => i.elementType === "Casting");
      if (
        castingItems.length > 0 &&
        castingItems.some((i) => i.waxCount == null || i.waxCount < 0)
      ) {
        throw new ProductionRunError(
          "Enter wax mould counts for all casting elements before continuing.",
        );
      }
      break;
    }
    case "Casting": {
      if (run.items.some((i) => !i.castingReceived)) {
        throw new ProductionRunError(
          "Mark all elements as casting received before continuing.",
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
    default:
      break;
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
