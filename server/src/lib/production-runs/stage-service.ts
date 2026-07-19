import { ProductionRunStatusEnum, StageLogAction } from "@prisma/client";
import { prisma } from "../db.js";
import { ProductionRunError } from "./errors.js";
import { assertProductionRunInOrganization } from "../organizations/access.js";
import {
  buildAutoFinishedGoodsInput,
  finalizeProductionRunAfterTx,
  finalizeProductionRunInTx,
  PRODUCTION_RUN_COMPLETION_TX_OPTIONS,
} from "./run-completion.js";
import { isMetalIssueStage } from "./metal-issue-service.js";
import { CHECKOFF_STAGES, STAGE_WORKSHEET_CONFIG } from "./stage-config.js";
import {
  getEarlierStages,
  isStageBefore,
  nextProductionRunStage,
  toApiProductionRunStage,
  toDbProductionRunStage,
  type CompleteProductionRunStageInput,
  type ProductionRunStage,
  type ProductionRunStageLog,
  type RejectProductionRunStageInput,
  type StageLogAction as ApiStageLogAction,
} from "./stages.js";

type Actor = { id: string; name: string };

const toStageLog = (row: {
  id: string;
  productionRunId: string;
  stage: string;
  action: string;
  karigarName: string | null;
  notes: string | null;
  rejectionReason: string | null;
  rejectedToStage: string | null;
  performedById: string | null;
  performedByName: string;
  createdAt: Date;
}): ProductionRunStageLog => ({
  id: row.id,
  productionRunId: row.productionRunId,
  stage: toApiProductionRunStage(row.stage as Parameters<typeof toApiProductionRunStage>[0]),
  action: row.action as ApiStageLogAction,
  karigarName: row.karigarName ?? undefined,
  notes: row.notes ?? undefined,
  rejectionReason: row.rejectionReason ?? undefined,
  rejectedToStage: row.rejectedToStage
    ? toApiProductionRunStage(
        row.rejectedToStage as Parameters<typeof toApiProductionRunStage>[0],
      )
    : undefined,
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
  organizationId: string,
): Promise<{
  currentStage: ProductionRunStage;
  stageLogs: ProductionRunStageLog[];
}> => {
  await assertProductionRunInOrganization(runId, organizationId);

  if (!input.karigarName?.trim()) {
    throw new ProductionRunError("Assigned karigar is required to complete a stage.");
  }

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

  await validateStageComplete(run, stage);

  const next = nextProductionRunStage(stage);
  const isLast = next === null;

  const finishedGoodsInput = isLast
    ? await buildAutoFinishedGoodsInput(runId)
    : undefined;

  await prisma.$transaction(
    async (tx) => {
      await tx.productionRunStageLog.create({
        data: {
          productionRunId: runId,
          stage: toDbProductionRunStage(stage),
          action: StageLogAction.Completed,
          karigarName: input.karigarName.trim(),
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

      if (isLast) {
        await finalizeProductionRunInTx(tx, runId, actor, finishedGoodsInput);
      }
    },
    PRODUCTION_RUN_COMPLETION_TX_OPTIONS,
  );

  if (isLast) {
    await finalizeProductionRunAfterTx();
  }

  const logs = await listProductionRunStageLogs(runId);
  const updated = await prisma.productionRun.findUnique({ where: { id: runId } });
  return {
    currentStage: toApiProductionRunStage(updated!.currentStage),
    stageLogs: logs,
  };
};

export const rejectProductionRunStage = async (
  runId: string,
  currentStage: ProductionRunStage,
  input: RejectProductionRunStageInput,
  actor: Actor,
  organizationId: string,
): Promise<{
  currentStage: ProductionRunStage;
  stageLogs: ProductionRunStageLog[];
}> => {
  await assertProductionRunInOrganization(runId, organizationId);

  if (!input.reason?.trim()) {
    throw new ProductionRunError("Rejection reason is required.");
  }
  if (!isStageBefore(input.rejectedToStage, currentStage)) {
    throw new ProductionRunError(
      "Can only send back to an earlier stage in the production flow.",
    );
  }

  const run = await prisma.productionRun.findUnique({ where: { id: runId } });
  if (!run) throw new ProductionRunError("Production run not found.", 404);

  const current = toApiProductionRunStage(run.currentStage);
  if (current !== currentStage) {
    throw new ProductionRunError(
      `Cannot reject "${currentStage}" — run is currently at "${current}".`,
      400,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.productionRunStageLog.create({
      data: {
        productionRunId: runId,
        stage: toDbProductionRunStage(currentStage),
        action: StageLogAction.Rejected,
        karigarName: input.karigarName?.trim() || null,
        rejectionReason: input.reason.trim(),
        rejectedToStage: toDbProductionRunStage(input.rejectedToStage),
        performedById: actor.id,
        performedByName: actor.name,
      },
    });

    await tx.productionRun.update({
      where: { id: runId },
      data: {
        currentStage: toDbProductionRunStage(input.rejectedToStage),
        status: ProductionRunStatusEnum.InProgress,
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

export { getEarlierStages };

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

const validateStageComplete = async (
  run: {
    id: string;
    items: Array<{
      id: string;
      elementType: string;
      waxCount: number | null;
      castingReceived: boolean;
      czStones: number | null;
      czWeight: number | null;
      stageCheckoffs?: unknown;
    }>;
  },
  stage: ProductionRunStage,
): Promise<void> => {
  if (isMetalIssueStage(stage)) {
    const openIssues = await prisma.productionRunMetalIssue.findMany({
      where: {
        productionRunId: run.id,
        stage: toDbProductionRunStage(stage),
        status: "Open",
      },
    });
    if (openIssues.length > 0) {
      const total = openIssues.reduce(
        (sum, i) => sum + Number(i.weightIssuedGrams),
        0,
      );
      throw new ProductionRunError(
        `${openIssues.length} metal issue(s) totalling ${total}g are still unsettled for this stage (issued to: ${openIssues.map((i) => i.karigarName).join(", ")}). Record the return before completing this stage.`,
      );
    }
  }

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
    case "Quality Check": {
      const records = await prisma.productionRunQcRecord.findMany({
        where: { productionRunId: run.id },
        orderBy: { createdAt: "desc" },
      });
      const latestByItem = new Map<string, (typeof records)[number]>();
      for (const record of records) {
        if (!latestByItem.has(record.productionRunItemId)) {
          latestByItem.set(record.productionRunItemId, record);
        }
      }
      const pending = run.items.filter(
        (item) => latestByItem.get(item.id)?.result !== "Pass",
      );
      if (pending.length > 0) {
        throw new ProductionRunError(
          `Complete QC inspection for all elements before continuing (${pending.length} pending or failed).`,
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
): ProductionRunStage[] =>
  logs.filter((l) => l.action === "Completed").map((l) => l.stage);
