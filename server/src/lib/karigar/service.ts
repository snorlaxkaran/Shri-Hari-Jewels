import { DesignApprovalStatus } from "@prisma/client";
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

export const generateSettlementFromProductionRun = async (
  productionRunId: string,
  organizationId: string,
  createdByName: string,
): Promise<Array<{ id: string; karigarName: string }>> => {
  await assertProductionRunInOrganization(productionRunId, organizationId);

  const run = await prisma.productionRun.findUnique({
    where: { id: productionRunId },
    include: {
      design: { select: { metal: true, purity: true } },
      metalIssues: true,
    },
  });
  if (!run) throw new ProductionRunError("Production run not found.", 404);

  const ratePerGram = await resolveGoldRate(run.design.metal, run.design.purity);

  const byKarigar = new Map<
    string,
    { issued: number; returned: number; loss: number }
  >();

  for (const issue of run.metalIssues) {
    const acc = byKarigar.get(issue.karigarName) ?? {
      issued: 0,
      returned: 0,
      loss: 0,
    };
    acc.issued += moneyToNumber(String(issue.weightIssuedGrams));
    acc.returned += moneyToNumber(String(issue.weightReturnedGrams));
    acc.loss += moneyToNumber(String(issue.weightLossGrams));
    byKarigar.set(issue.karigarName, acc);
  }

  if (byKarigar.size === 0) {
    throw new ProductionRunError(
      "No metal issues found for this production run. Issue metal to karigars first.",
    );
  }

  const existing = await prisma.karigarSettlement.findMany({
    where: { productionRunId, organizationId, status: "Open" },
    select: { karigarName: true },
  });
  const existingKarigars = new Set(existing.map((e) => e.karigarName));

  const created: Array<{ id: string; karigarName: string }> = [];

  for (const [karigarName, totals] of byKarigar) {
    if (existingKarigars.has(karigarName)) continue;

    const wastageCost = totals.loss * ratePerGram;
    const row = await createKarigarSettlement({
      organizationId,
      productionRunId,
      karigarName,
      metalIssuedGrams: totals.issued,
      metalReturnedGrams: totals.returned,
      wastageCost,
      makingChargeWage: 0,
      notes: `Auto-generated from production run ${run.runNo}`,
      createdByName,
    });
    created.push({ id: row.id, karigarName });
  }

  return created;
};
