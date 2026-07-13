import { StageLogAction } from "@prisma/client";
import { prisma } from "../db.js";
import { moneyToNumber, toMoney } from "../money.js";
import { assertProductionRunInOrganization } from "../organizations/access.js";
import { ProductionRunError } from "./errors.js";
import {
  toApiProductionRunStage,
  toDbProductionRunStage,
  type ProductionRunStage,
} from "./stages.js";

type Actor = { id: string; name: string };

export class MetalIssueError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "MetalIssueError";
  }
}

export type MetalIssueRecord = {
  id: string;
  productionRunId: string;
  stage: ProductionRunStage;
  metalLotId?: string;
  karigarName: string;
  purity: string;
  weightIssuedGrams: number;
  weightReturnedGrams: number;
  weightLossGrams: number;
  lossReason?: string;
  status: "Open" | "Settled";
  issuedByName: string;
  settledByName?: string;
  issuedAt: string;
  settledAt?: string;
};

const roundWeight = (value: number) => Math.round(value * 1000) / 1000;

const toMetalIssue = (row: {
  id: string;
  productionRunId: string;
  stage: string;
  metalLotId: string | null;
  karigarName: string;
  purity: string;
  weightIssuedGrams: { toString(): string };
  weightReturnedGrams: { toString(): string };
  weightLossGrams: { toString(): string };
  lossReason: string | null;
  status: string;
  issuedByName: string;
  settledByName: string | null;
  issuedAt: Date;
  settledAt: Date | null;
}): MetalIssueRecord => ({
  id: row.id,
  productionRunId: row.productionRunId,
  stage: toApiProductionRunStage(row.stage as Parameters<typeof toApiProductionRunStage>[0]),
  metalLotId: row.metalLotId ?? undefined,
  karigarName: row.karigarName,
  purity: row.purity,
  weightIssuedGrams: moneyToNumber(String(row.weightIssuedGrams)),
  weightReturnedGrams: moneyToNumber(String(row.weightReturnedGrams)),
  weightLossGrams: moneyToNumber(String(row.weightLossGrams)),
  lossReason: row.lossReason ?? undefined,
  status: row.status as "Open" | "Settled",
  issuedByName: row.issuedByName,
  settledByName: row.settledByName ?? undefined,
  issuedAt: row.issuedAt.toISOString(),
  settledAt: row.settledAt?.toISOString(),
});

const recordMetalAudit = async (
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  input: {
    stockId: string;
    lotRef: string;
    previousWeight: number;
    newWeight: number;
    delta: number;
    reason: string;
    performedById?: string;
    performedByName: string;
  },
) => {
  await tx.rawStockAuditLog.create({
    data: {
      stockType: "Metal",
      stockId: input.stockId,
      lotRef: input.lotRef,
      action: "Adjustment",
      previousValue: JSON.stringify({ weightGrams: input.previousWeight }),
      newValue: JSON.stringify({ weightGrams: input.newWeight }),
      delta: input.delta,
      reason: input.reason,
      performedById: input.performedById,
      performedByName: input.performedByName,
    },
  });
};

export const listMetalIssuesForRun = async (
  productionRunId: string,
  organizationId: string,
): Promise<MetalIssueRecord[]> => {
  await assertProductionRunInOrganization(productionRunId, organizationId);
  const rows = await prisma.productionRunMetalIssue.findMany({
    where: { productionRunId },
    orderBy: { issuedAt: "asc" },
  });
  return rows.map(toMetalIssue);
};

export const issueMetalToKarigar = async (
  productionRunId: string,
  stage: ProductionRunStage,
  input: {
    karigarName: string;
    weightIssuedGrams: number;
    metalLotId?: string;
    purity: string;
  },
  organizationId: string,
  issuedBy: Actor,
): Promise<MetalIssueRecord> => {
  await assertProductionRunInOrganization(productionRunId, organizationId);

  if (!input.karigarName?.trim()) {
    throw new MetalIssueError("Karigar name is required.");
  }
  if (!input.weightIssuedGrams || input.weightIssuedGrams <= 0) {
    throw new MetalIssueError("Issue weight must be greater than zero.");
  }
  if (!input.purity?.trim()) {
    throw new MetalIssueError("Purity is required.");
  }

  const run = await prisma.productionRun.findUnique({
    where: { id: productionRunId },
    select: { id: true, branchId: true, runNo: true },
  });
  if (!run) throw new MetalIssueError("Production run not found.", 404);

  const issue = await prisma.$transaction(async (tx) => {
    if (input.metalLotId) {
      const lot = await tx.metalLot.findFirst({
        where: { id: input.metalLotId, branchId: run.branchId },
      });
      if (!lot) throw new MetalIssueError("Metal lot not found.", 404);
      if (lot.weightGrams < input.weightIssuedGrams) {
        throw new MetalIssueError(
          `Insufficient metal in lot ${lot.lotNumber}: need ${input.weightIssuedGrams}g, have ${lot.weightGrams}g.`,
        );
      }
      const newWeight = roundWeight(lot.weightGrams - input.weightIssuedGrams);
      await tx.metalLot.update({
        where: { id: lot.id },
        data: { weightGrams: newWeight },
      });
      await recordMetalAudit(tx, {
        stockId: lot.id,
        lotRef: lot.lotNumber,
        previousWeight: lot.weightGrams,
        newWeight,
        delta: -input.weightIssuedGrams,
        reason: `Issued to karigar ${input.karigarName.trim()} for run ${run.runNo} (${stage})`,
        performedById: issuedBy.id,
        performedByName: issuedBy.name,
      });
    }

    const created = await tx.productionRunMetalIssue.create({
      data: {
        branchId: run.branchId,
        productionRunId,
        stage: toDbProductionRunStage(stage),
        metalLotId: input.metalLotId ?? null,
        karigarName: input.karigarName.trim(),
        purity: input.purity.trim(),
        weightIssuedGrams: toMoney(input.weightIssuedGrams),
        issuedByName: issuedBy.name,
      },
    });

    await tx.productionRun.update({
      where: { id: productionRunId },
      data: { metalInventoryDeducted: true },
    });

    return created;
  });

  return toMetalIssue(issue);
};

export const recordMetalReturn = async (
  metalIssueId: string,
  input: {
    weightReturnedGrams: number;
    lossReason?: string;
  },
  organizationId: string,
  settledBy: Actor,
): Promise<MetalIssueRecord> => {
  const issue = await prisma.productionRunMetalIssue.findFirst({
    where: { id: metalIssueId, branch: { organizationId } },
    include: {
      productionRun: { select: { runNo: true } },
      metalLot: true,
    },
  });
  if (!issue) throw new MetalIssueError("Metal issue not found.", 404);
  if (issue.status === "Settled") {
    throw new MetalIssueError("This metal issue is already settled.");
  }

  const issued = moneyToNumber(String(issue.weightIssuedGrams));
  if (input.weightReturnedGrams < 0 || input.weightReturnedGrams > issued) {
    throw new MetalIssueError(
      `Returned weight must be between 0 and ${issued}g.`,
    );
  }

  const weightLoss = roundWeight(issued - input.weightReturnedGrams);
  if (weightLoss > 0 && !input.lossReason?.trim()) {
    throw new MetalIssueError("Loss reason is required when there is metal wastage.");
  }

  const updated = await prisma.$transaction(async (tx) => {
    if (input.weightReturnedGrams > 0 && issue.metalLot) {
      const lot = issue.metalLot;
      const newWeight = roundWeight(lot.weightGrams + input.weightReturnedGrams);
      await tx.metalLot.update({
        where: { id: lot.id },
        data: { weightGrams: newWeight },
      });
      await recordMetalAudit(tx, {
        stockId: lot.id,
        lotRef: lot.lotNumber,
        previousWeight: lot.weightGrams,
        newWeight,
        delta: input.weightReturnedGrams,
        reason: `Returned from karigar ${issue.karigarName} for run ${issue.productionRun.runNo}`,
        performedById: settledBy.id,
        performedByName: settledBy.name,
      });
    }

    return tx.productionRunMetalIssue.update({
      where: { id: metalIssueId },
      data: {
        weightReturnedGrams: toMoney(input.weightReturnedGrams),
        weightLossGrams: toMoney(weightLoss),
        lossReason: input.lossReason?.trim() || null,
        status: "Settled",
        settledByName: settledBy.name,
        settledAt: new Date(),
      },
    });
  });

  return toMetalIssue(updated);
};

export type MetalWastageReport = {
  totalIssuedGrams: number;
  totalReturnedGrams: number;
  totalLossGrams: number;
  byStage: Array<{
    stage: ProductionRunStage;
    issuedGrams: number;
    returnedGrams: number;
    lossGrams: number;
  }>;
  byKarigar: Array<{
    karigarName: string;
    issuedGrams: number;
    returnedGrams: number;
    lossGrams: number;
  }>;
};

export const getMetalWastageReport = async (
  productionRunId: string,
  organizationId: string,
): Promise<MetalWastageReport> => {
  await assertProductionRunInOrganization(productionRunId, organizationId);

  const issues = await prisma.productionRunMetalIssue.findMany({
    where: { productionRunId },
  });

  const byStageMap = new Map<
    string,
    { issued: number; returned: number; loss: number }
  >();
  const byKarigarMap = new Map<
    string,
    { issued: number; returned: number; loss: number }
  >();

  let totalIssued = 0;
  let totalReturned = 0;
  let totalLoss = 0;

  for (const row of issues) {
    const issued = moneyToNumber(String(row.weightIssuedGrams));
    const returned = moneyToNumber(String(row.weightReturnedGrams));
    const loss = moneyToNumber(String(row.weightLossGrams));
    totalIssued += issued;
    totalReturned += returned;
    totalLoss += loss;

    const stageKey = row.stage;
    const stageAcc = byStageMap.get(stageKey) ?? { issued: 0, returned: 0, loss: 0 };
    stageAcc.issued += issued;
    stageAcc.returned += returned;
    stageAcc.loss += loss;
    byStageMap.set(stageKey, stageAcc);

    const karigarAcc = byKarigarMap.get(row.karigarName) ?? {
      issued: 0,
      returned: 0,
      loss: 0,
    };
    karigarAcc.issued += issued;
    karigarAcc.returned += returned;
    karigarAcc.loss += loss;
    byKarigarMap.set(row.karigarName, karigarAcc);
  }

  return {
    totalIssuedGrams: roundWeight(totalIssued),
    totalReturnedGrams: roundWeight(totalReturned),
    totalLossGrams: roundWeight(totalLoss),
    byStage: [...byStageMap.entries()].map(([stage, totals]) => ({
      stage: toApiProductionRunStage(stage as Parameters<typeof toApiProductionRunStage>[0]),
      issuedGrams: roundWeight(totals.issued),
      returnedGrams: roundWeight(totals.returned),
      lossGrams: roundWeight(totals.loss),
    })),
    byKarigar: [...byKarigarMap.entries()].map(([karigarName, totals]) => ({
      karigarName,
      issuedGrams: roundWeight(totals.issued),
      returnedGrams: roundWeight(totals.returned),
      lossGrams: roundWeight(totals.loss),
    })),
  };
};
