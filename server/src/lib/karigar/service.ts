import { prisma } from "../db.js";
import { moneyToNumber, toMoney } from "../money.js";

export const listKarigarSettlements = async (
  organizationId: string,
  status?: "Open" | "Settled",
) => {
  const rows = await prisma.karigarSettlement.findMany({
    where: {
      organizationId,
      ...(status ? { status } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    karigarName: r.karigarName,
    productionRunId: r.productionRunId ?? undefined,
    metalIssuedGrams: moneyToNumber(r.metalIssuedGrams),
    metalReturnedGrams: moneyToNumber(r.metalReturnedGrams),
    wastageGrams: moneyToNumber(r.wastageGrams),
    makingChargeWage: moneyToNumber(r.makingChargeWage),
    totalPayable: moneyToNumber(r.totalPayable),
    status: r.status,
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
