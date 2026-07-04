import {
  StoneMovementType,
  StonePurchaseLotStatus,
  StoneCategory,
  type StoneCategory as StoneCategoryEnum,
} from "@prisma/client";
import { prisma } from "../db.js";
import { organizationBranchFilter } from "../branches/access.js";
import { assertBranchInOrganization } from "../organizations/access.js";
import { moneyToNumber } from "../money.js";
import { generateLotNo } from "./lot-number.js";
import { findOrCreateQuickAddStoneMaster } from "./quick-add-stone-master.js";
import type {
  AdjustStonePurchaseLotInput,
  IssueStoneInput,
  NewStonePurchaseLotInput,
  QuickAddStoneLotInput,
  SettleStoneIssueInput,
  StoneLotDetail,
  StoneLotSummary,
  StoneMovementRecord,
  StonePurchaseLot,
  StonePurchaseLotSummaryCards,
  StonePurchaseLotWithMaster,
  UnsettledStoneIssue,
} from "../../types.js";

export class StoneLotError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "StoneLotError";
  }
}

const stoneMasterSelect = {
  id: true,
  stoneCode: true,
  stoneName: true,
  stoneCategory: true,
  stoneType: true,
  stoneMaterial: true,
  shape: true,
  sizeMm: true,
  color: true,
  clarityGrade: true,
  uom: true,
  unitWeightCt: true,
} as const;

const toPurchaseLot = (row: {
  id: string;
  branchId: string;
  stoneMasterId: string;
  lotNo: string;
  packetNo: string | null;
  vendorStoneCode: string | null;
  vendorName: string;
  invoiceNo: string;
  invoiceDate: Date;
  qtyPurchased: number;
  weightPurchased: { toString(): string };
  purchaseRate: { toString(): string };
  amount: { toString(): string };
  gstPct: { toString(): string };
  gstAmount: { toString(): string };
  totalAmount: { toString(): string };
  currentQty: number;
  currentWeightCt: { toString(): string };
  location: string | null;
  reorderLevel: number | null;
  status: StonePurchaseLotStatus;
  notes: string | null;
  createdByName: string;
  createdAt: Date;
  updatedAt: Date;
  stoneMaster?: {
    id: string;
    stoneCode: string;
    stoneName: string;
    stoneCategory: StoneCategory;
    stoneType: string;
    stoneMaterial: string;
    shape: string;
    sizeMm: string;
    color: string;
    clarityGrade: string | null;
    uom: string;
    unitWeightCt: { toString(): string } | null;
  };
  branch?: { name: string };
}): StonePurchaseLotWithMaster => ({
  id: row.id,
  branchId: row.branchId,
  branchName: row.branch?.name,
  stoneMasterId: row.stoneMasterId,
  lotNo: row.lotNo,
  packetNo: row.packetNo ?? undefined,
  vendorStoneCode: row.vendorStoneCode ?? undefined,
  vendorName: row.vendorName,
  invoiceNo: row.invoiceNo,
  invoiceDate: row.invoiceDate.toISOString(),
  qtyPurchased: row.qtyPurchased,
  weightPurchased: moneyToNumber(String(row.weightPurchased)),
  purchaseRate: moneyToNumber(String(row.purchaseRate)),
  amount: moneyToNumber(String(row.amount)),
  gstPct: moneyToNumber(String(row.gstPct)),
  gstAmount: moneyToNumber(String(row.gstAmount)),
  totalAmount: moneyToNumber(String(row.totalAmount)),
  currentQty: row.currentQty,
  currentWeightCt: moneyToNumber(String(row.currentWeightCt)),
  location: row.location ?? undefined,
  reorderLevel: row.reorderLevel ?? undefined,
  status: row.status,
  notes: row.notes ?? undefined,
  createdByName: row.createdByName,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  stoneMaster: row.stoneMaster
    ? {
        id: row.stoneMaster.id,
        stoneCode: row.stoneMaster.stoneCode,
        stoneName: row.stoneMaster.stoneName,
        stoneCategory: row.stoneMaster.stoneCategory,
        stoneType: row.stoneMaster.stoneType,
        stoneMaterial: row.stoneMaster.stoneMaterial,
        shape: row.stoneMaster.shape,
        sizeMm: row.stoneMaster.sizeMm,
        color: row.stoneMaster.color,
        clarityGrade: row.stoneMaster.clarityGrade ?? undefined,
        uom: row.stoneMaster.uom,
        unitWeightCt:
          row.stoneMaster.unitWeightCt != null
            ? moneyToNumber(String(row.stoneMaster.unitWeightCt))
            : undefined,
      }
    : undefined,
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
}): StoneMovementRecord => ({
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

const calcAmounts = (qty: number, rate: number, gstPct: number) => {
  const amount = Math.round(qty * rate * 100) / 100;
  const gstAmount = Math.round((amount * gstPct) / 100 * 100) / 100;
  const totalAmount = Math.round((amount + gstAmount) * 100) / 100;
  return { amount, gstAmount, totalAmount };
};

const assertLotInOrg = async (lotId: string, organizationId: string) => {
  const lot = await prisma.stoneLot.findFirst({
    where: { id: lotId, branch: { organizationId } },
    include: { stoneMaster: true },
  });
  if (!lot) throw new StoneLotError("Stone lot not found.", 404);
  return lot;
};

export const listStonePurchaseLots = async (
  organizationId: string,
  branchId?: string,
  filters?: { status?: StonePurchaseLotStatus; search?: string },
): Promise<StonePurchaseLotWithMaster[]> => {
  const search = filters?.search?.trim();
  const rows = await prisma.stoneLot.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(search
        ? {
            OR: [
              { lotNo: { contains: search, mode: "insensitive" } },
              { vendorName: { contains: search, mode: "insensitive" } },
              { invoiceNo: { contains: search, mode: "insensitive" } },
              {
                stoneMaster: {
                  stoneName: { contains: search, mode: "insensitive" },
                },
              },
              {
                stoneMaster: {
                  stoneCode: { contains: search, mode: "insensitive" },
                },
              },
            ],
          }
        : {}),
    },
    include: { stoneMaster: true, branch: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return rows.map(toPurchaseLot);
};

export const getStonePurchaseLotDetail = async (
  id: string,
  organizationId: string,
): Promise<StoneLotDetail> => {
  const lot = await prisma.stoneLot.findFirst({
    where: { id, branch: { organizationId } },
    include: {
      stoneMaster: true,
      branch: { select: { name: true } },
      movements: { orderBy: { createdAt: "asc" } },
    },
  });
  if (!lot) throw new StoneLotError("Stone lot not found.", 404);

  const issued = lot.movements
    .filter((m) => m.movementType === StoneMovementType.Issue)
    .reduce((s, m) => s + m.qty, 0);
  const returned = lot.movements
    .filter((m) => m.movementType === StoneMovementType.Return)
    .reduce((s, m) => s + m.qty, 0);
  const losses = lot.movements
    .filter(
      (m) =>
        m.movementType === StoneMovementType.Loss ||
        m.movementType === StoneMovementType.Breakage,
    )
    .reduce((s, m) => s + m.qty, 0);
  const lossValue = lot.movements
    .filter(
      (m) =>
        m.movementType === StoneMovementType.Loss ||
        m.movementType === StoneMovementType.Breakage,
    )
    .reduce((s, m) => s + moneyToNumber(String(m.totalValue)), 0);

  return {
    ...toPurchaseLot(lot),
    movements: lot.movements.map(toMovement),
    stats: {
      purchasedQty: lot.qtyPurchased,
      purchasedWeightCt: moneyToNumber(String(lot.weightPurchased)),
      inStockQty: lot.currentQty,
      inStockWeightCt: moneyToNumber(String(lot.currentWeightCt)),
      issuedQty: issued - returned,
      lossQty: losses,
      lossValue,
    },
  };
};

export const receiveStoneLot = async (
  input: NewStonePurchaseLotInput,
  organizationId: string,
  branchId: string,
  createdByName: string,
): Promise<StonePurchaseLotWithMaster> => {
  if (!input.stoneMasterId?.trim()) {
    throw new StoneLotError("Stone master selection is required.");
  }
  if (!input.vendorName?.trim()) {
    throw new StoneLotError("Vendor name is required.");
  }
  if (!input.invoiceNo?.trim()) {
    throw new StoneLotError("Invoice number is required.");
  }
  if (!input.invoiceDate) {
    throw new StoneLotError("Invoice date is required.");
  }
  if (!input.qtyPurchased || input.qtyPurchased <= 0) {
    throw new StoneLotError("Quantity purchased must be greater than zero.");
  }
  if (input.weightPurchased == null || input.weightPurchased < 0) {
    throw new StoneLotError("Weight purchased is required.");
  }
  if (input.purchaseRate == null || input.purchaseRate < 0) {
    throw new StoneLotError("Purchase rate is required.");
  }

  await assertBranchInOrganization(branchId, organizationId);

  const master = await prisma.stoneMaster.findFirst({
    where: { id: input.stoneMasterId, organizationId },
  });
  if (!master) {
    throw new StoneLotError("Stone master entry not found in your company.");
  }

  const gstPct = input.gstPct ?? 0;
  const { amount, gstAmount, totalAmount } = calcAmounts(
    input.qtyPurchased,
    input.purchaseRate,
    gstPct,
  );

  const lot = await prisma.$transaction(async (tx) => {
    const lotNo =
      input.lotNo?.trim() ||
      (await generateLotNo(tx, organizationId));

    const existingLotNo = await tx.stoneLot.findUnique({
      where: { branchId_lotNo: { branchId, lotNo } },
    });
    if (existingLotNo) {
      throw new StoneLotError(`Lot number "${lotNo}" already exists.`);
    }

    const created = await tx.stoneLot.create({
      data: {
        branchId,
        stoneMasterId: master.id,
        lotNo,
        packetNo: input.packetNo?.trim() || null,
        vendorStoneCode: input.vendorStoneCode?.trim() || null,
        vendorName: input.vendorName.trim(),
        invoiceNo: input.invoiceNo.trim(),
        invoiceDate: new Date(input.invoiceDate),
        qtyPurchased: input.qtyPurchased,
        weightPurchased: input.weightPurchased,
        purchaseRate: input.purchaseRate,
        amount,
        gstPct,
        gstAmount,
        totalAmount,
        currentQty: input.qtyPurchased,
        currentWeightCt: input.weightPurchased,
        location: input.location?.trim() || null,
        reorderLevel: input.reorderLevel ?? null,
        notes: input.notes?.trim() || null,
        createdByName,
      },
      include: { stoneMaster: true, branch: { select: { name: true } } },
    });

    await tx.stoneMovement.create({
      data: {
        branchId,
        stoneLotId: created.id,
        movementType: StoneMovementType.Receipt,
        qty: input.qtyPurchased,
        weightCt: input.weightPurchased,
        balanceQtyAfter: input.qtyPurchased,
        balanceWeightAfter: input.weightPurchased,
        ratePerUnit: input.purchaseRate,
        totalValue: amount,
        notes: `Receipt: ${input.invoiceNo.trim()} / ${input.vendorName.trim()}`,
        performedByName: createdByName,
      },
    });

    return created;
  });

  return toPurchaseLot(lot);
};

export const quickReceiveStoneLot = async (
  input: QuickAddStoneLotInput,
  organizationId: string,
  branchId: string,
  createdByName: string,
): Promise<StonePurchaseLotWithMaster> => {
  const validCategories = Object.values(StoneCategory);
  if (!input.stoneCategory || !validCategories.includes(input.stoneCategory as StoneCategoryEnum)) {
    throw new StoneLotError("Stone type is required.");
  }
  if (!input.qtyPurchased || input.qtyPurchased <= 0) {
    throw new StoneLotError("Quantity must be greater than zero.");
  }
  if (input.weightPurchased == null || input.weightPurchased < 0) {
    throw new StoneLotError("Weight is required.");
  }

  await assertBranchInOrganization(branchId, organizationId);

  const invoiceDate = input.invoiceDate
    ? new Date(input.invoiceDate)
    : new Date();
  const vendorName = input.vendorName?.trim() || "Not specified";
  const invoiceNo = input.invoiceNo?.trim() || "QUICK";
  const purchaseRate = input.purchaseRate ?? 0;
  const gstPct = input.gstPct ?? 0;
  const { amount, gstAmount, totalAmount } = calcAmounts(
    input.qtyPurchased,
    purchaseRate,
    gstPct,
  );

  const lot = await prisma.$transaction(async (tx) => {
    const master = await findOrCreateQuickAddStoneMaster(
      tx,
      organizationId,
      input.stoneCategory,
      createdByName,
    );

    const lotNo =
      input.lotNo?.trim() ||
      (await generateLotNo(tx, organizationId));

    const existingLotNo = await tx.stoneLot.findUnique({
      where: { branchId_lotNo: { branchId, lotNo } },
    });
    if (existingLotNo) {
      throw new StoneLotError(`Lot number "${lotNo}" already exists.`);
    }

    const created = await tx.stoneLot.create({
      data: {
        branchId,
        stoneMasterId: master.id,
        lotNo,
        packetNo: input.packetNo?.trim() || null,
        vendorStoneCode: input.vendorStoneCode?.trim() || null,
        vendorName,
        invoiceNo,
        invoiceDate,
        qtyPurchased: input.qtyPurchased,
        weightPurchased: input.weightPurchased,
        purchaseRate,
        amount,
        gstPct,
        gstAmount,
        totalAmount,
        currentQty: input.qtyPurchased,
        currentWeightCt: input.weightPurchased,
        location: input.location?.trim() || null,
        reorderLevel: input.reorderLevel ?? null,
        notes: input.notes?.trim() || null,
        createdByName,
      },
      include: { stoneMaster: true, branch: { select: { name: true } } },
    });

    await tx.stoneMovement.create({
      data: {
        branchId,
        stoneLotId: created.id,
        movementType: StoneMovementType.Receipt,
        qty: input.qtyPurchased,
        weightCt: input.weightPurchased,
        balanceQtyAfter: input.qtyPurchased,
        balanceWeightAfter: input.weightPurchased,
        ratePerUnit: purchaseRate,
        totalValue: amount,
        notes: `Quick Add receipt: ${invoiceNo} / ${vendorName}`,
        performedByName: createdByName,
      },
    });

    return created;
  });

  return toPurchaseLot(lot);
};

export const adjustStoneLotStock = async (
  lotId: string,
  input: AdjustStonePurchaseLotInput,
  organizationId: string,
  performedByName: string,
): Promise<StoneLotDetail> => {
  if (!input.reason?.trim()) {
    throw new StoneLotError("Reason is required for stock adjustment.");
  }
  if (!input.qtyDelta || input.qtyDelta === 0) {
    throw new StoneLotError("Quantity adjustment cannot be zero.");
  }

  const lot = await assertLotInOrg(lotId, organizationId);
  const newQty = lot.currentQty + input.qtyDelta;
  const weightDelta =
    input.weightDeltaCt ??
    (lot.stoneMaster.unitWeightCt != null
      ? input.qtyDelta * moneyToNumber(String(lot.stoneMaster.unitWeightCt))
      : 0);
  const newWeight =
    moneyToNumber(String(lot.currentWeightCt)) + weightDelta;

  if (newQty < 0 || newWeight < 0) {
    throw new StoneLotError("Adjustment would result in negative stock.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.stoneLot.update({
      where: { id: lotId },
      data: {
        currentQty: newQty,
        currentWeightCt: newWeight,
        status:
          newQty === 0
            ? StonePurchaseLotStatus.Depleted
            : StonePurchaseLotStatus.Active,
      },
    });

    await tx.stoneMovement.create({
      data: {
        branchId: lot.branchId,
        stoneLotId: lotId,
        movementType: StoneMovementType.Adjustment,
        qty: Math.abs(input.qtyDelta),
        weightCt: Math.abs(weightDelta),
        balanceQtyAfter: newQty,
        balanceWeightAfter: newWeight,
        ratePerUnit: lot.purchaseRate,
        totalValue: Math.abs(
          input.qtyDelta * moneyToNumber(String(lot.purchaseRate)),
        ),
        reason: input.reason.trim(),
        performedByName,
      },
    });
  });

  return getStonePurchaseLotDetail(lotId, organizationId);
};

export const getStoneLotsSummary = async (
  organizationId: string,
  branchId?: string,
): Promise<StonePurchaseLotSummaryCards> => {
  const filter = organizationBranchFilter(organizationId, branchId);
  const lots = await prisma.stoneLot.findMany({
    where: filter,
    include: { stoneMaster: { select: { stoneCategory: true } } },
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const movements = await prisma.stoneMovement.findMany({
    where: {
      branch: organizationBranchFilter(organizationId, branchId).branch,
      movementType: { in: [StoneMovementType.Loss, StoneMovementType.Breakage] },
      createdAt: { gte: monthStart },
    },
  });

  const byCategory: Record<string, StoneLotSummary> = {};
  let totalLots = 0;
  let activeLots = 0;
  let totalQty = 0;
  let totalWeight = 0;
  let totalValue = 0;

  for (const lot of lots) {
    totalLots += 1;
    if (lot.status === StonePurchaseLotStatus.Active) activeLots += 1;
    totalQty += lot.currentQty;
    totalWeight += moneyToNumber(String(lot.currentWeightCt));
    totalValue +=
      lot.currentQty * moneyToNumber(String(lot.purchaseRate));

    const cat = lot.stoneMaster.stoneCategory;
    if (!byCategory[cat]) {
      byCategory[cat] = { category: cat, qty: 0, weightCt: 0, value: 0 };
    }
    byCategory[cat].qty += lot.currentQty;
    byCategory[cat].weightCt += moneyToNumber(String(lot.currentWeightCt));
    byCategory[cat].value +=
      lot.currentQty * moneyToNumber(String(lot.purchaseRate));
  }

  const lossesMtdQty = movements.reduce((s, m) => s + m.qty, 0);
  const lossesMtdValue = movements.reduce(
    (s, m) => s + moneyToNumber(String(m.totalValue)),
    0,
  );

  return {
    totalLots,
    activeLots,
    totalQty,
    totalWeightCt: Math.round(totalWeight * 10000) / 10000,
    totalValue: Math.round(totalValue * 100) / 100,
    lossesMtdQty,
    lossesMtdValue: Math.round(lossesMtdValue * 100) / 100,
    byCategory: Object.values(byCategory),
  };
};

export const issueStonesToKarigar = async (
  lotId: string,
  input: IssueStoneInput,
  organizationId: string,
  issuedByName: string,
): Promise<UnsettledStoneIssue> => {
  if (!input.productionRunId?.trim()) {
    throw new StoneLotError("Production run is required.");
  }
  if (!input.karigarName?.trim()) {
    throw new StoneLotError("Karigar name is required.");
  }
  if (!input.qtyIssued || input.qtyIssued <= 0) {
    throw new StoneLotError("Issue quantity must be greater than zero.");
  }

  const lot = await assertLotInOrg(lotId, organizationId);

  const run = await prisma.productionRun.findFirst({
    where: {
      id: input.productionRunId,
      branch: { organizationId },
    },
  });
  if (!run) throw new StoneLotError("Production run not found.", 404);
  if (run.branchId !== lot.branchId) {
    throw new StoneLotError("Stone lot and production run must be same branch.");
  }

  const weightIssued =
    input.weightIssuedCt ??
    (lot.stoneMaster.unitWeightCt != null
      ? input.qtyIssued * moneyToNumber(String(lot.stoneMaster.unitWeightCt))
      : 0);

  if (lot.currentQty < input.qtyIssued) {
    throw new StoneLotError(
      `Insufficient stock: need ${input.qtyIssued}, have ${lot.currentQty}.`,
    );
  }

  const newQty = lot.currentQty - input.qtyIssued;
  const newWeight =
    moneyToNumber(String(lot.currentWeightCt)) - weightIssued;

  const issue = await prisma.$transaction(async (tx) => {
    await tx.stoneLot.update({
      where: { id: lotId },
      data: {
        currentQty: newQty,
        currentWeightCt: newWeight,
        status:
          newQty === 0
            ? StonePurchaseLotStatus.Depleted
            : StonePurchaseLotStatus.Active,
      },
    });

    const createdIssue = await tx.productionRunStoneIssue.create({
      data: {
        branchId: lot.branchId,
        productionRunId: run.id,
        stoneLotId: lotId,
        stoneMasterId: lot.stoneMasterId,
        qtyIssued: input.qtyIssued,
        weightIssuedCt: weightIssued,
        karigarName: input.karigarName.trim(),
        issuedByName,
      },
      include: {
        stoneLot: { include: { stoneMaster: true } },
        productionRun: { select: { runNo: true } },
      },
    });

    await tx.stoneMovement.create({
      data: {
        branchId: lot.branchId,
        stoneLotId: lotId,
        movementType: StoneMovementType.Issue,
        qty: input.qtyIssued,
        weightCt: weightIssued,
        balanceQtyAfter: newQty,
        balanceWeightAfter: newWeight,
        productionRunId: run.id,
        productionRunStoneIssueId: createdIssue.id,
        karigarName: input.karigarName.trim(),
        ratePerUnit: lot.purchaseRate,
        totalValue: input.qtyIssued * moneyToNumber(String(lot.purchaseRate)),
        performedByName: issuedByName,
      },
    });

    return createdIssue;
  });

  return {
    id: issue.id,
    productionRunId: issue.productionRunId,
    runNo: issue.productionRun.runNo,
    stoneLotId: issue.stoneLotId,
    lotNo: issue.stoneLot.lotNo,
    stoneMasterId: issue.stoneMasterId,
    stoneName: issue.stoneLot.stoneMaster.stoneName,
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
      stoneLot: { include: { stoneMaster: true } },
      productionRun: { select: { runNo: true } },
    },
  });
  if (!issue) throw new StoneLotError("Stone issue not found.", 404);
  if (issue.status === "Settled") {
    throw new StoneLotError("This issue is already settled.");
  }

  const qtyReturned = input.qtyReturned ?? 0;
  const qtyBroken = input.qtyBroken ?? 0;
  const qtyLost = input.qtyLost ?? 0;
  const qtyUsed = input.qtyUsed ?? 0;

  const total = qtyReturned + qtyBroken + qtyLost + qtyUsed;
  if (total !== issue.qtyIssued) {
    throw new StoneLotError(
      `Returned + Broken + Lost + Used (${total}) must equal Issued (${issue.qtyIssued}).`,
    );
  }

  if (qtyLost > 0 && !input.lossReason?.trim()) {
    throw new StoneLotError("Loss reason is required when reporting lost stones.");
  }

  const unitWeight =
    issue.stoneLot.stoneMaster.unitWeightCt != null
      ? moneyToNumber(String(issue.stoneLot.stoneMaster.unitWeightCt))
      : issue.qtyIssued > 0
        ? moneyToNumber(String(issue.weightIssuedCt)) / issue.qtyIssued
        : 0;

  const weightReturned = input.weightReturnedCt ?? qtyReturned * unitWeight;
  const weightBroken = input.weightBrokenCt ?? qtyBroken * unitWeight;
  const weightLost = input.weightLostCt ?? qtyLost * unitWeight;
  const weightUsed = input.weightUsedCt ?? qtyUsed * unitWeight;

  const lot = issue.stoneLot;
  const returnQty = qtyReturned;
  const newQty = lot.currentQty + returnQty;
  const newWeight =
    moneyToNumber(String(lot.currentWeightCt)) + weightReturned;

  await prisma.$transaction(async (tx) => {
    if (returnQty > 0) {
      await tx.stoneMovement.create({
        data: {
          branchId: lot.branchId,
          stoneLotId: lot.id,
          movementType: StoneMovementType.Return,
          qty: returnQty,
          weightCt: weightReturned,
          balanceQtyAfter: newQty,
          balanceWeightAfter: newWeight,
          productionRunId: issue.productionRunId,
          productionRunStoneIssueId: issue.id,
          karigarName: issue.karigarName,
          ratePerUnit: lot.purchaseRate,
          totalValue: returnQty * moneyToNumber(String(lot.purchaseRate)),
          performedByName: settledByName,
        },
      });
    }

    let balanceQty = newQty;
    let balanceWeight = newWeight;

    if (qtyBroken > 0) {
      await tx.stoneMovement.create({
        data: {
          branchId: lot.branchId,
          stoneLotId: lot.id,
          movementType: StoneMovementType.Breakage,
          qty: qtyBroken,
          weightCt: weightBroken,
          balanceQtyAfter: balanceQty,
          balanceWeightAfter: balanceWeight,
          productionRunId: issue.productionRunId,
          productionRunStoneIssueId: issue.id,
          karigarName: issue.karigarName,
          ratePerUnit: lot.purchaseRate,
          totalValue: qtyBroken * moneyToNumber(String(lot.purchaseRate)),
          performedByName: settledByName,
        },
      });
    }

    if (qtyLost > 0) {
      await tx.stoneMovement.create({
        data: {
          branchId: lot.branchId,
          stoneLotId: lot.id,
          movementType: StoneMovementType.Loss,
          qty: qtyLost,
          weightCt: weightLost,
          balanceQtyAfter: balanceQty,
          balanceWeightAfter: balanceWeight,
          productionRunId: issue.productionRunId,
          productionRunStoneIssueId: issue.id,
          karigarName: issue.karigarName,
          ratePerUnit: lot.purchaseRate,
          totalValue: qtyLost * moneyToNumber(String(lot.purchaseRate)),
          reason: input.lossReason!.trim(),
          performedByName: settledByName,
        },
      });
    }

    await tx.stoneLot.update({
      where: { id: lot.id },
      data: {
        currentQty: balanceQty,
        currentWeightCt: balanceWeight,
        status:
          balanceQty === 0
            ? StonePurchaseLotStatus.Depleted
            : StonePurchaseLotStatus.Active,
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
        weightUsedCt: weightUsed,
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
      stoneLot: { include: { stoneMaster: true } },
      productionRun: { select: { runNo: true } },
    },
  });

  return {
    id: updated.id,
    productionRunId: updated.productionRunId,
    runNo: updated.productionRun.runNo,
    stoneLotId: updated.stoneLotId,
    lotNo: updated.stoneLot.lotNo,
    stoneMasterId: updated.stoneMasterId,
    stoneName: updated.stoneLot.stoneMaster.stoneName,
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
      stoneLot: { include: { stoneMaster: true } },
      productionRun: { select: { runNo: true } },
    },
    orderBy: { issuedAt: "asc" },
  });

  return rows.map((issue) => ({
    id: issue.id,
    productionRunId: issue.productionRunId,
    runNo: issue.productionRun.runNo,
    stoneLotId: issue.stoneLotId,
    lotNo: issue.stoneLot.lotNo,
    stoneMasterId: issue.stoneMasterId,
    stoneName: issue.stoneLot.stoneMaster.stoneName,
    qtyIssued: issue.qtyIssued,
    weightIssuedCt: moneyToNumber(String(issue.weightIssuedCt)),
    karigarName: issue.karigarName,
    status: issue.status,
    issuedAt: issue.issuedAt.toISOString(),
    issuedByName: issue.issuedByName,
  }));
};

export const getStoneLotLedger = async (
  lotId: string,
  organizationId: string,
): Promise<StoneMovementRecord[]> => {
  await assertLotInOrg(lotId, organizationId);
  const movements = await prisma.stoneMovement.findMany({
    where: { stoneLotId: lotId, branch: { organizationId } },
    orderBy: { createdAt: "asc" },
  });
  return movements.map(toMovement);
};

/** Average purchase rate for a stone master (for motif pricing) */
export const getStoneMasterAvgRate = async (
  stoneMasterId: string,
  organizationId: string,
): Promise<number> => {
  const lots = await prisma.stoneLot.findMany({
    where: {
      stoneMasterId,
      branch: { organizationId },
      currentQty: { gt: 0 },
    },
    select: { purchaseRate: true, currentQty: true },
  });
  if (!lots.length) return 0;
  let totalQty = 0;
  let totalValue = 0;
  for (const lot of lots) {
    totalQty += lot.currentQty;
    totalValue +=
      lot.currentQty * moneyToNumber(String(lot.purchaseRate));
  }
  return totalQty > 0 ? Math.round((totalValue / totalQty) * 10000) / 10000 : 0;
};
