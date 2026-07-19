import { StoneRateBasis } from "@prisma/client";
import { prisma } from "../db.js";
import { moneyToNumber, toMoney } from "../money.js";
import { getLatestRate } from "../market-rates/service.js";
import { assertProductionRunInOrganization } from "../organizations/access.js";
import { ProductionRunError } from "../production-runs/errors.js";

export const listKarigarSettlements = async (
  organizationId: string,
  filters?: {
    status?: "Open" | "Settled";
    karigarName?: string;
    fromDate?: string;
    toDate?: string;
  },
) => {
  const rows = await prisma.karigarSettlement.findMany({
    where: {
      organizationId,
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.karigarName
        ? { karigarName: { contains: filters.karigarName, mode: "insensitive" } }
        : {}),
      ...(filters?.fromDate || filters?.toDate
        ? {
            createdAt: {
              ...(filters.fromDate ? { gte: new Date(filters.fromDate) } : {}),
              ...(filters.toDate ? { lte: new Date(filters.toDate) } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    karigarName: r.karigarName,
    productionRunId: r.productionRunId ?? undefined,
    metalIssuedGrams: moneyToNumber(r.metalIssuedGrams),
    metalReturnedGrams: moneyToNumber(r.metalReturnedGrams),
    wastageGrams: moneyToNumber(r.wastageGrams),
    wastageCost: moneyToNumber(r.wastageCost),
    makingChargeWage: moneyToNumber(r.makingChargeWage),
    totalPayable: moneyToNumber(r.totalPayable),
    status: r.status,
    notes: r.notes ?? undefined,
    settledAt: r.settledAt?.toISOString(),
    createdAt: r.createdAt.toISOString(),
  }));
};

export const createKarigarSettlement = async (input: {
  organizationId: string;
  productionRunId?: string;
  karigarName: string;
  metalIssuedGrams: number;
  metalReturnedGrams: number;
  wastageCost?: number;
  makingChargeWage: number;
  notes?: string;
  createdByName: string;
}) => {
  const wastageGrams = Math.max(
    0,
    input.metalIssuedGrams - input.metalReturnedGrams,
  );
  const totalPayable =
    input.makingChargeWage + (input.wastageCost ?? 0);

  return prisma.karigarSettlement.create({
    data: {
      organizationId: input.organizationId,
      productionRunId: input.productionRunId,
      karigarName: input.karigarName,
      metalIssuedGrams: toMoney(input.metalIssuedGrams),
      metalReturnedGrams: toMoney(input.metalReturnedGrams),
      wastageGrams: toMoney(wastageGrams),
      wastageCost: toMoney(input.wastageCost ?? 0),
      makingChargeWage: toMoney(input.makingChargeWage),
      totalPayable: toMoney(totalPayable),
      notes: input.notes,
      createdByName: input.createdByName,
    },
  });
};

export const settleKarigarSettlement = async (
  id: string,
  organizationId: string,
  settledByName: string,
) => {
  return prisma.karigarSettlement.updateMany({
    where: { id, organizationId, status: "Open" },
    data: { status: "Settled", settledAt: new Date(), settledByName },
  });
};

const resolveGoldRate = async (
  metalType: string | null,
  purity: string | null,
): Promise<number> => {
  if (!metalType || !purity) return 0;
  const rate = await getLatestRate(metalType, purity);
  return rate ? moneyToNumber(rate.ratePerGram) : 0;
};

type KarigarAggregate = {
  issued: number;
  returned: number;
  loss: number;
  stoneLossCost: number;
};

const emptyKarigarAggregate = (): KarigarAggregate => ({
  issued: 0,
  returned: 0,
  loss: 0,
  stoneLossCost: 0,
});

const calcStoneIssueLossCost = (
  issue: {
    qtyBroken: number;
    qtyLost: number;
    weightBrokenCt: { toString(): string };
    weightLostCt: { toString(): string };
  },
  stoneStock: {
    ratePerUnit: { toString(): string };
    rateBasis: StoneRateBasis;
  },
): number => {
  const rate = moneyToNumber(String(stoneStock.ratePerUnit));
  if (stoneStock.rateBasis === StoneRateBasis.Pcs) {
    return (issue.qtyBroken + issue.qtyLost) * rate;
  }
  const lostCt =
    moneyToNumber(String(issue.weightBrokenCt)) +
    moneyToNumber(String(issue.weightLostCt));
  return Math.round(lostCt * rate * 100) / 100;
};

export const generateSettlementFromProductionRun = async (
  productionRunId: string,
  organizationId: string,
  createdByName: string,
): Promise<Array<{ id: string; karigarName: string }>> => {
  await assertProductionRunInOrganization(productionRunId, organizationId);

  const run = await prisma.productionRun.findUnique({
    where: { id: productionRunId },
    include: {
      design: {
        select: { metal: true, purity: true, makingChargesPerSet: true },
      },
      metalIssues: true,
      stoneIssues: { include: { stoneStock: true } },
    },
  });
  if (!run) throw new ProductionRunError("Production run not found.", 404);

  const ratePerGram = await resolveGoldRate(run.design.metal, run.design.purity);

  const byKarigar = new Map<string, KarigarAggregate>();

  for (const issue of run.metalIssues) {
    const acc = byKarigar.get(issue.karigarName) ?? emptyKarigarAggregate();
    acc.issued += moneyToNumber(String(issue.weightIssuedGrams));
    acc.returned += moneyToNumber(String(issue.weightReturnedGrams));
    acc.loss += moneyToNumber(String(issue.weightLossGrams));
    byKarigar.set(issue.karigarName, acc);
  }

  for (const issue of run.stoneIssues) {
    const acc = byKarigar.get(issue.karigarName) ?? emptyKarigarAggregate();
    acc.stoneLossCost += calcStoneIssueLossCost(issue, issue.stoneStock);
    byKarigar.set(issue.karigarName, acc);
  }

  if (byKarigar.size === 0) {
    throw new ProductionRunError(
      "No metal or stone issues found for this production run. Issue materials to karigars first.",
    );
  }

  const makingPerSet = run.design.makingChargesPerSet
    ? moneyToNumber(String(run.design.makingChargesPerSet))
    : 0;
  const totalMaking = makingPerSet * run.setsOrdered;
  const perKarigarMaking =
    byKarigar.size > 0
      ? Math.round((totalMaking / byKarigar.size) * 100) / 100
      : 0;

  const existing = await prisma.karigarSettlement.findMany({
    where: { productionRunId, organizationId, status: "Open" },
    select: { karigarName: true },
  });
  const existingKarigars = new Set(existing.map((e) => e.karigarName));

  const created: Array<{ id: string; karigarName: string }> = [];

  for (const [karigarName, totals] of byKarigar) {
    if (existingKarigars.has(karigarName)) continue;

    const metalWastageCost = totals.loss * ratePerGram;
    const wastageCost = Math.round((metalWastageCost + totals.stoneLossCost) * 100) / 100;
    const stoneNote =
      totals.stoneLossCost > 0
        ? `; stone loss cost ₹${totals.stoneLossCost.toFixed(2)}`
        : "";
    const row = await createKarigarSettlement({
      organizationId,
      productionRunId,
      karigarName,
      metalIssuedGrams: totals.issued,
      metalReturnedGrams: totals.returned,
      wastageCost,
      makingChargeWage: perKarigarMaking,
      notes: `Auto-generated from production run ${run.runNo}${stoneNote}`,
      createdByName,
    });
    created.push({ id: row.id, karigarName });
  }

  return created;
};
