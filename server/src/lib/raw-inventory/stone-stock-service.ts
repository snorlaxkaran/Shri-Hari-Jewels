import {
  StoneMovementType,
  StoneRateBasis,
  StoneStockStatus,
} from "@prisma/client";
import { prisma } from "../db.js";
import { organizationBranchFilter } from "../branches/access.js";
import { assertBranchInOrganization } from "../organizations/access.js";
import { moneyToNumber } from "../money.js";
import { resolveStoneTypeName } from "../stone-types/service.js";
import { generateStoneStockLotNo } from "./stone-stock-lot-no.js";
import type {
  AdjustStoneStockInput,
  IssueStoneInput,
  NewStoneStockInput,
  SettleStoneIssueInput,
  StoneStock,
  StoneStockDetail,
  StoneStockMovementRecord,
  StoneStockSummaryCards,
  UnsettledStoneIssue,
} from "../../types.js";

export class StoneStockError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "StoneStockError";
  }
}

const calcTotalValue = (
  pieces: number,
  weightCt: number,
  rate: number,
  basis: StoneRateBasis,
): number => {
  const base = basis === StoneRateBasis.Pcs ? pieces * rate : weightCt * rate;
  return Math.round(base * 100) / 100;
};

const stockValue = (
  currentPieces: number,
  currentWeightCt: number,
  rate: number,
  basis: StoneRateBasis,
): number =>
  calcTotalValue(currentPieces, currentWeightCt, rate, basis);

const toStoneStock = (row: {
  id: string;
  organizationId: string;
  branchId: string;
  stoneType: string;
  lotNo: string;
  pieces: number | null;
  weightCt: { toString(): string } | null;
  ratePerUnit: { toString(): string };
  rateBasis: StoneRateBasis;
  supplierName: string;
  totalValue: { toString(): string };
  currentPieces: number;
  currentWeightCt: { toString(): string };
  purchaseDate: Date;
  status: StoneStockStatus;
  notes: string | null;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  branch?: { name: string };
}): StoneStock => ({
  id: row.id,
  organizationId: row.organizationId,
  branchId: row.branchId,
  branchName: row.branch?.name,
  stoneType: row.stoneType,
  lotNo: row.lotNo,
  pieces: row.pieces ?? undefined,
  weightCt:
    row.weightCt != null ? moneyToNumber(String(row.weightCt)) : undefined,
  ratePerUnit: moneyToNumber(String(row.ratePerUnit)),
  rateBasis: row.rateBasis,
  supplierName: row.supplierName,
  totalValue: moneyToNumber(String(row.totalValue)),
  currentPieces: row.currentPieces,
  currentWeightCt: moneyToNumber(String(row.currentWeightCt)),
  purchaseDate: row.purchaseDate.toISOString(),
  status: row.status,
  notes: row.notes ?? undefined,
  createdByName: row.createdByName,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const toMovement = (row: {
  id: string;
  movementType: StoneMovementType;
  qty: number;
  weightCt: { toString(): string };
  balanceQtyAfter: number;
  balanceWeightAfter: { toString(): string };
  productionRunId: string | null;
  karigarName: string | null;
  ratePerUnit: { toString(): string };
  totalValue: { toString(): string };
  reason: string | null;
  notes: string | null;
  performedByName: string;
  createdAt: Date;
}): StoneStockMovementRecord => ({
  id: row.id,
  movementType: row.movementType,
  qty: row.qty,
  weightCt: moneyToNumber(String(row.weightCt)),
  balanceQtyAfter: row.balanceQtyAfter,
  balanceWeightAfter: moneyToNumber(String(row.balanceWeightAfter)),
  productionRunId: row.productionRunId ?? undefined,
  karigarName: row.karigarName ?? undefined,
  ratePerUnit: moneyToNumber(String(row.ratePerUnit)),
  totalValue: moneyToNumber(String(row.totalValue)),
  reason: row.reason ?? undefined,
  notes: row.notes ?? undefined,
  performedByName: row.performedByName,
  createdAt: row.createdAt.toISOString(),
});

const assertStockInOrg = async (stockId: string, organizationId: string) => {
  const stock = await prisma.stoneStock.findFirst({
    where: { id: stockId, branch: { organizationId } },
  });
  if (!stock) throw new StoneStockError("Stone stock entry not found.", 404);
  return stock;
};

export const listStoneStock = async (
  organizationId: string,
  branchId?: string,
  filters?: { status?: StoneStockStatus; search?: string },
): Promise<StoneStock[]> => {
  const search = filters?.search?.trim();
  const rows = await prisma.stoneStock.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { lotNo: { contains: search, mode: "insensitive" } },
              { supplierName: { contains: search, mode: "insensitive" } },
              { stoneType: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: { branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toStoneStock);
};

export const getStoneStockDetail = async (
  id: string,
  organizationId: string,
): Promise<StoneStockDetail> => {
  const stock = await prisma.stoneStock.findFirst({
    where: { id, branch: { organizationId } },
    include: {
      branch: { select: { name: true } },
      movements: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!stock) throw new StoneStockError("Stone stock entry not found.", 404);

  const issued = stock.movements
    .filter((m) => m.movementType === StoneMovementType.Issue)
    .reduce((s, m) => s + m.qty, 0);
  const returned = stock.movements
    .filter((m) => m.movementType === StoneMovementType.Return)
    .reduce((s, m) => s + m.qty, 0);
  const losses = stock.movements
    .filter(
      (m) =>
        m.movementType === StoneMovementType.Loss ||
        m.movementType === StoneMovementType.Breakage,
    )
    .reduce((s, m) => s + m.qty, 0);
  const lossValue = stock.movements
    .filter(
      (m) =>
        m.movementType === StoneMovementType.Loss ||
        m.movementType === StoneMovementType.Breakage,
    )
    .reduce((s, m) => s + moneyToNumber(String(m.totalValue)), 0);

  return {
    ...toStoneStock(stock),
    movements: stock.movements.map(toMovement),
    stats: {
      purchasedPieces: stock.pieces ?? 0,
      purchasedWeightCt:
        stock.weightCt != null ? moneyToNumber(String(stock.weightCt)) : 0,
      inStockPieces: stock.currentPieces,
      inStockWeightCt: moneyToNumber(String(stock.currentWeightCt)),
      issuedPieces: issued - returned,
      lossPieces: losses,
      lossValue,
    },
  };
};

export const createStoneStock = async (
  input: NewStoneStockInput,
  organizationId: string,
  branchId: string,
  createdByName: string,
): Promise<StoneStock> => {
  const pieces = input.pieces ?? 0;
  const weightCt = input.weightCt ?? 0;
  const hasPieces = pieces > 0;
  const hasWeight = weightCt > 0;

  if (!hasPieces && !hasWeight) {
    throw new StoneStockError("Enter pieces or weight — at least one is required.");
  }
  if (!input.supplierName?.trim()) {
    throw new StoneStockError("Supplier name is required.");
  }
  if (input.ratePerUnit == null || input.ratePerUnit < 0) {
    throw new StoneStockError("Rate is required.");
  }

  await assertBranchInOrganization(branchId, organizationId);

  const stoneType = await resolveStoneTypeName(
    organizationId,
    input.stoneTypeId,
    input.stoneName,
    createdByName,
  );
  const rateBasis = hasPieces ? StoneRateBasis.Pcs : StoneRateBasis.Carat;
  const totalValue = calcTotalValue(pieces, weightCt, input.ratePerUnit, rateBasis);
  const purchaseDate = input.purchaseDate
    ? new Date(input.purchaseDate)
    : new Date();

  const created = await prisma.$transaction(async (tx) => {
    const lotNo =
      input.lotNo?.trim() ||
      (await generateStoneStockLotNo(tx, organizationId));

    const existing = await tx.stoneStock.findUnique({
      where: { branchId_lotNo: { branchId, lotNo } },
    });
    if (existing) {
      throw new StoneStockError(`Reference number "${lotNo}" already exists.`);
    }

    const row = await tx.stoneStock.create({
      data: {
        organizationId,
        branchId,
        stoneType,
        lotNo,
        pieces: hasPieces ? pieces : null,
        weightCt: hasWeight ? weightCt : null,
        ratePerUnit: input.ratePerUnit,
        rateBasis,
        supplierName: input.supplierName.trim(),
        totalValue,
        currentPieces: pieces,
        currentWeightCt: weightCt,
        purchaseDate,
        notes: input.notes?.trim() || null,
        createdByName,
      },
      include: { branch: { select: { name: true } } },
    });

    await tx.stoneStockMovement.create({
      data: {
        branchId,
        stoneStockId: row.id,
        movementType: StoneMovementType.Receipt,
        qty: pieces,
        weightCt,
        balanceQtyAfter: pieces,
        balanceWeightAfter: weightCt,
        ratePerUnit: input.ratePerUnit,
        totalValue,
        notes: `Receipt: ${lotNo} / ${input.supplierName.trim()}`,
        performedByName: createdByName,
      },
    });

    return row;
  });

  return toStoneStock(created);
};

export const adjustStoneStock = async (
  stockId: string,
  input: AdjustStoneStockInput,
  organizationId: string,
  performedByName: string,
): Promise<StoneStockDetail> => {
  if (!input.reason?.trim()) {
    throw new StoneStockError("Reason is required for stock adjustment.");
  }

  const stock = await assertStockInOrg(stockId, organizationId);
  const qtyDelta = input.qtyDelta ?? 0;
  const weightDelta = input.weightDeltaCt ?? 0;

  if (qtyDelta === 0 && weightDelta === 0) {
    throw new StoneStockError("Adjustment cannot be zero.");
  }

  const newPieces = stock.currentPieces + qtyDelta;
  const newWeight =
    moneyToNumber(String(stock.currentWeightCt)) + weightDelta;

  if (newPieces < 0 || newWeight < 0) {
    throw new StoneStockError("Adjustment would result in negative stock.");
  }

  const rate = moneyToNumber(String(stock.ratePerUnit));

  await prisma.$transaction(async (tx) => {
    await tx.stoneStock.update({
      where: { id: stockId },
      data: {
        currentPieces: newPieces,
        currentWeightCt: newWeight,
        status:
          newPieces === 0 && newWeight === 0
            ? StoneStockStatus.Depleted
            : StoneStockStatus.Active,
      },
    });

    await tx.stoneStockMovement.create({
      data: {
        branchId: stock.branchId,
        stoneStockId: stockId,
        movementType: StoneMovementType.Adjustment,
        qty: Math.abs(qtyDelta),
        weightCt: Math.abs(weightDelta),
        balanceQtyAfter: newPieces,
        balanceWeightAfter: newWeight,
        ratePerUnit: rate,
        totalValue: Math.abs(
          stock.rateBasis === StoneRateBasis.Pcs
            ? qtyDelta * rate
            : weightDelta * rate,
        ),
        reason: input.reason.trim(),
        performedByName,
      },
    });
  });

  return getStoneStockDetail(stockId, organizationId);
};

export const getStoneStockSummary = async (
  organizationId: string,
  branchId?: string,
): Promise<StoneStockSummaryCards> => {
  const filter = organizationBranchFilter(organizationId, branchId);
  const rows = await prisma.stoneStock.findMany({ where: filter });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const movements = await prisma.stoneStockMovement.findMany({
    where: {
      branch: organizationBranchFilter(organizationId, branchId).branch,
      movementType: { in: [StoneMovementType.Loss, StoneMovementType.Breakage] },
      createdAt: { gte: monthStart },
    },
  });

  let totalEntries = 0;
  let activeEntries = 0;
  let totalPieces = 0;
  let totalWeightCt = 0;
  let totalValue = 0;
  const byType: Record<string, { stoneType: string; pieces: number; weightCt: number; value: number }> = {};

  for (const row of rows) {
    totalEntries += 1;
    if (row.status === StoneStockStatus.Active) activeEntries += 1;
    totalPieces += row.currentPieces;
    const weight = moneyToNumber(String(row.currentWeightCt));
    totalWeightCt += weight;
    const rate = moneyToNumber(String(row.ratePerUnit));
    const value = stockValue(row.currentPieces, weight, rate, row.rateBasis);
    totalValue += value;

    if (!byType[row.stoneType]) {
      byType[row.stoneType] = {
        stoneType: row.stoneType,
        pieces: 0,
        weightCt: 0,
        value: 0,
      };
    }
    byType[row.stoneType].pieces += row.currentPieces;
    byType[row.stoneType].weightCt += weight;
    byType[row.stoneType].value += value;
  }

  const lossesMtdQty = movements.reduce((s, m) => s + m.qty, 0);
  const lossesMtdValue = movements.reduce(
    (s, m) => s + moneyToNumber(String(m.totalValue)),
    0,
  );

  return {
    totalEntries,
    activeEntries,
    totalPieces,
    totalWeightCt: Math.round(totalWeightCt * 10000) / 10000,
    totalValue: Math.round(totalValue * 100) / 100,
    lossesMtdQty,
    lossesMtdValue: Math.round(lossesMtdValue * 100) / 100,
    byType: Object.values(byType),
  };
};

export const getStoneTypeAvgRate = async (
  stoneType: string,
  organizationId: string,
): Promise<number> => {
  const rows = await prisma.stoneStock.findMany({
    where: {
      stoneType: { equals: stoneType, mode: "insensitive" },
      branch: { organizationId },
      status: StoneStockStatus.Active,
      OR: [{ currentPieces: { gt: 0 } }, { currentWeightCt: { gt: 0 } }],
    },
    select: {
      ratePerUnit: true,
      rateBasis: true,
      currentPieces: true,
      currentWeightCt: true,
    },
  });
  if (!rows.length) return 0;

  let totalQty = 0;
  let totalValue = 0;
  for (const row of rows) {
    const rate = moneyToNumber(String(row.ratePerUnit));
    if (row.rateBasis === StoneRateBasis.Pcs) {
      totalQty += row.currentPieces;
      totalValue += row.currentPieces * rate;
    } else {
      const weight = moneyToNumber(String(row.currentWeightCt));
      totalQty += weight;
      totalValue += weight * rate;
    }
  }
  return totalQty > 0 ? Math.round((totalValue / totalQty) * 10000) / 10000 : 0;
};

export const issueStonesToKarigar = async (
  stockId: string,
  input: IssueStoneInput,
  organizationId: string,
  issuedByName: string,
): Promise<UnsettledStoneIssue> => {
  if (!input.productionRunId?.trim()) {
    throw new StoneStockError("Production run is required.");
  }
  if (!input.karigarName?.trim()) {
    throw new StoneStockError("Karigar name is required.");
  }
  if (!input.qtyIssued || input.qtyIssued <= 0) {
    throw new StoneStockError("Issue quantity must be greater than zero.");
  }

  const stock = await assertStockInOrg(stockId, organizationId);

  const run = await prisma.productionRun.findFirst({
    where: { id: input.productionRunId, branch: { organizationId } },
  });
  if (!run) throw new StoneStockError("Production run not found.", 404);
  if (run.branchId !== stock.branchId) {
    throw new StoneStockError("Stone stock and production run must be same branch.");
  }

  const weightIssued =
    input.weightIssuedCt ??
    (stock.rateBasis === StoneRateBasis.Carat && stock.pieces
      ? (moneyToNumber(String(stock.weightCt ?? 0)) / stock.pieces) * input.qtyIssued
      : 0);

  if (stock.currentPieces < input.qtyIssued) {
    throw new StoneStockError(
      `Insufficient stock: need ${input.qtyIssued}, have ${stock.currentPieces}.`,
    );
  }

  const newPieces = stock.currentPieces - input.qtyIssued;
  const newWeight =
    moneyToNumber(String(stock.currentWeightCt)) - weightIssued;
  const rate = moneyToNumber(String(stock.ratePerUnit));

  const issue = await prisma.$transaction(async (tx) => {
    await tx.stoneStock.update({
      where: { id: stockId },
      data: {
        currentPieces: newPieces,
        currentWeightCt: newWeight,
        status:
          newPieces === 0 && newWeight === 0
            ? StoneStockStatus.Depleted
            : StoneStockStatus.Active,
      },
    });

    const createdIssue = await tx.productionRunStoneIssue.create({
      data: {
        branchId: stock.branchId,
        productionRunId: run.id,
        stoneStockId: stockId,
        qtyIssued: input.qtyIssued,
        weightIssuedCt: weightIssued,
        karigarName: input.karigarName.trim(),
        issuedByName,
      },
      include: {
        stoneStock: true,
        productionRun: { select: { runNo: true } },
      },
    });

    await tx.stoneStockMovement.create({
      data: {
        branchId: stock.branchId,
        stoneStockId: stockId,
        movementType: StoneMovementType.Issue,
        qty: input.qtyIssued,
        weightCt: weightIssued,
        balanceQtyAfter: newPieces,
        balanceWeightAfter: newWeight,
        productionRunId: run.id,
        productionRunStoneIssueId: createdIssue.id,
        karigarName: input.karigarName.trim(),
        ratePerUnit: rate,
        totalValue: input.qtyIssued * rate,
        performedByName: issuedByName,
      },
    });

    return createdIssue;
  });

  return {
    id: issue.id,
    productionRunId: issue.productionRunId,
    runNo: issue.productionRun.runNo,
    stoneStockId: issue.stoneStockId,
    lotNo: issue.stoneStock.lotNo,
    stoneType: issue.stoneStock.stoneType,
    qtyIssued: issue.qtyIssued,
    weightIssuedCt: moneyToNumber(String(issue.weightIssuedCt)),
    karigarName: issue.karigarName,
    status: issue.status,
    issuedAt: issue.issuedAt.toISOString(),
    issuedByName: issue.issuedByName,
  };
};

export const settleStoneIssue = async (
  issueId: string,
  input: SettleStoneIssueInput,
  organizationId: string,
  settledByName: string,
): Promise<UnsettledStoneIssue> => {
  const issue = await prisma.productionRunStoneIssue.findFirst({
    where: { id: issueId, branch: { organizationId } },
    include: {
      stoneStock: true,
      productionRun: { select: { runNo: true } },
    },
  });
  if (!issue) throw new StoneStockError("Stone issue not found.", 404);
  if (issue.status === "Settled") {
    throw new StoneStockError("This issue is already settled.");
  }

  const qtyReturned = input.qtyReturned ?? 0;
  const qtyBroken = input.qtyBroken ?? 0;
  const qtyLost = input.qtyLost ?? 0;
  const qtyUsed = input.qtyUsed ?? 0;
  const total = qtyReturned + qtyBroken + qtyLost + qtyUsed;

  if (total !== issue.qtyIssued) {
    throw new StoneStockError(
      `Returned + Broken + Lost + Used (${total}) must equal Issued (${issue.qtyIssued}).`,
    );
  }
  if (qtyLost > 0 && !input.lossReason?.trim()) {
    throw new StoneStockError("Loss reason is required when reporting lost stones.");
  }

  const stock = issue.stoneStock;
  const rate = moneyToNumber(String(stock.ratePerUnit));
  const unitWeight =
    issue.qtyIssued > 0
      ? moneyToNumber(String(issue.weightIssuedCt)) / issue.qtyIssued
      : 0;

  const weightReturned = input.weightReturnedCt ?? qtyReturned * unitWeight;
  const weightBroken = input.weightBrokenCt ?? qtyBroken * unitWeight;
  const weightLost = input.weightLostCt ?? qtyLost * unitWeight;

  const newPieces = stock.currentPieces + qtyReturned;
  const newWeight =
    moneyToNumber(String(stock.currentWeightCt)) + weightReturned;

  await prisma.$transaction(async (tx) => {
    if (qtyReturned > 0) {
      await tx.stoneStockMovement.create({
        data: {
          branchId: stock.branchId,
          stoneStockId: stock.id,
          movementType: StoneMovementType.Return,
          qty: qtyReturned,
          weightCt: weightReturned,
          balanceQtyAfter: newPieces,
          balanceWeightAfter: newWeight,
          productionRunId: issue.productionRunId,
          productionRunStoneIssueId: issue.id,
          karigarName: issue.karigarName,
          ratePerUnit: rate,
          totalValue: qtyReturned * rate,
          performedByName: settledByName,
        },
      });
    }

    const recordLoss = async (
      qty: number,
      weight: number,
      type: StoneMovementType,
      reason?: string,
    ) => {
      if (qty <= 0) return;
      await tx.stoneStockMovement.create({
        data: {
          branchId: stock.branchId,
          stoneStockId: stock.id,
          movementType: type,
          qty,
          weightCt: weight,
          balanceQtyAfter: newPieces,
          balanceWeightAfter: newWeight,
          productionRunId: issue.productionRunId,
          productionRunStoneIssueId: issue.id,
          karigarName: issue.karigarName,
          ratePerUnit: rate,
          totalValue: qty * rate,
          reason,
          performedByName: settledByName,
        },
      });
    };

    await recordLoss(qtyBroken, weightBroken, StoneMovementType.Breakage);
    await recordLoss(qtyLost, weightLost, StoneMovementType.Loss, input.lossReason?.trim());

    await tx.stoneStock.update({
      where: { id: stock.id },
      data: {
        currentPieces: newPieces,
        currentWeightCt: newWeight,
        status:
          newPieces === 0 && newWeight === 0
            ? StoneStockStatus.Depleted
            : StoneStockStatus.Active,
      },
    });

    await tx.productionRunStoneIssue.update({
      where: { id: issueId },
      data: {
        qtyReturned,
        weightReturnedCt: weightReturned,
        qtyBroken,
        weightBrokenCt: weightBroken,
        qtyLost,
        weightLostCt: weightLost,
        qtyUsed,
        weightUsedCt: input.weightUsedCt ?? qtyUsed * unitWeight,
        lossReason: input.lossReason?.trim() || null,
        status: "Settled",
        settledByName,
        settledAt: new Date(),
      },
    });
  });

  const updated = await prisma.productionRunStoneIssue.findUniqueOrThrow({
    where: { id: issueId },
    include: {
      stoneStock: true,
      productionRun: { select: { runNo: true } },
    },
  });

  return {
    id: updated.id,
    productionRunId: updated.productionRunId,
    runNo: updated.productionRun.runNo,
    stoneStockId: updated.stoneStockId,
    lotNo: updated.stoneStock.lotNo,
    stoneType: updated.stoneStock.stoneType,
    qtyIssued: updated.qtyIssued,
    weightIssuedCt: moneyToNumber(String(updated.weightIssuedCt)),
    karigarName: updated.karigarName,
    status: updated.status,
    issuedAt: updated.issuedAt.toISOString(),
    issuedByName: updated.issuedByName,
    settledAt: updated.settledAt?.toISOString(),
    settledByName: updated.settledByName ?? undefined,
  };
};

export const listUnsettledStoneIssues = async (
  organizationId: string,
  branchId?: string,
): Promise<UnsettledStoneIssue[]> => {
  const rows = await prisma.productionRunStoneIssue.findMany({
    where: {
      status: "Open",
      ...organizationBranchFilter(organizationId, branchId),
    },
    include: {
      stoneStock: true,
      productionRun: { select: { runNo: true } },
    },
    orderBy: { issuedAt: "asc" },
  });

  return rows.map((issue) => ({
    id: issue.id,
    productionRunId: issue.productionRunId,
    runNo: issue.productionRun.runNo,
    stoneStockId: issue.stoneStockId,
    lotNo: issue.stoneStock.lotNo,
    stoneType: issue.stoneStock.stoneType,
    qtyIssued: issue.qtyIssued,
    weightIssuedCt: moneyToNumber(String(issue.weightIssuedCt)),
    karigarName: issue.karigarName,
    status: issue.status,
    issuedAt: issue.issuedAt.toISOString(),
    issuedByName: issue.issuedByName,
  }));
};

export const getStoneStockLedger = async (
  stockId: string,
  organizationId: string,
): Promise<StoneStockMovementRecord[]> => {
  await assertStockInOrg(stockId, organizationId);
  const movements = await prisma.stoneStockMovement.findMany({
    where: { stoneStockId: stockId, branch: { organizationId } },
    orderBy: { createdAt: "asc" },
  });
  return movements.map(toMovement);
};
