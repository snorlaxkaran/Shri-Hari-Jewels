import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

type DbClient = Prisma.TransactionClient | typeof prisma;

/** Silver lots may be stored as 925 (design/motif standard) or 999 (fine silver). */
export const SILVER_PURITIES = new Set(["925", "999"]);

export const findMetalLotsForBranch = async (
  client: DbClient,
  branchId: string,
  metal: string,
  purity: string,
) => {
  const exact = await client.metalLot.findMany({
    where: {
      branchId,
      metalType: metal,
      purity,
      weightGrams: { gt: 0 },
    },
    orderBy: { weightGrams: "desc" },
  });
  if (exact.length > 0) return exact;

  if (metal === "Silver") {
    return client.metalLot.findMany({
      where: {
        branchId,
        metalType: "Silver",
        weightGrams: { gt: 0 },
      },
      orderBy: { weightGrams: "desc" },
    });
  }

  return [];
};

export const sumMetalLotGrams = (lots: Array<{ weightGrams: number }>) =>
  Math.round(lots.reduce((sum, lot) => sum + lot.weightGrams, 0) * 100) / 100;

export const getAvailableMetalGramsForDesign = async (
  branchId: string,
  metal: string,
  purity: string,
  client: DbClient = prisma,
): Promise<number> => {
  const lots = await findMetalLotsForBranch(client, branchId, metal, purity);
  return sumMetalLotGrams(lots);
};

export const describeMetalLotPool = (
  metal: string,
  purity: string,
  lots: Array<{ purity: string; weightGrams: number }>,
): string => {
  if (lots.length === 0) {
    return `no ${metal} ${purity} lots`;
  }

  const purities = [...new Set(lots.map((lot) => lot.purity))].join(", ");
  const total = sumMetalLotGrams(lots);
  if (metal === "Silver" && !lots.some((lot) => lot.purity === purity)) {
    return `${total}g silver available (${purities}) — design uses ${purity}`;
  }
  return `${total}g ${metal} ${purity}`;
};
