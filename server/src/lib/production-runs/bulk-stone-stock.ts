import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import type { StoneStockWarning } from "../../types.js";

export const computeStoneRequirements = async (
  designId: string,
  setsOrdered: number,
): Promise<Map<string, { stoneMasterId: string; stoneName: string; required: number }>> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: {
      elements: {
        include: {
          motif: {
            include: {
              stones: {
                include: { stoneMaster: true },
              },
            },
          },
        },
      },
    },
  });

  const requirements = new Map<
    string,
    { stoneMasterId: string; stoneName: string; required: number }
  >();

  if (!design) return requirements;

  for (const element of design.elements) {
    if (!element.motif?.stones.length) continue;

    for (const motifStone of element.motif.stones) {
      const needed =
        motifStone.qtyPerMotif * element.qtyPerSet * setsOrdered;
      const existing = requirements.get(motifStone.stoneMasterId);
      if (existing) {
        existing.required += needed;
      } else {
        requirements.set(motifStone.stoneMasterId, {
          stoneMasterId: motifStone.stoneMasterId,
          stoneName: motifStone.stoneMaster.stoneName,
          required: needed,
        });
      }
    }
  }

  return requirements;
};

export const checkStoneStock = async (
  designId: string,
  setsOrdered: number,
  branchId: string,
): Promise<StoneStockWarning[]> => {
  const requirements = await computeStoneRequirements(designId, setsOrdered);
  const warnings: StoneStockWarning[] = [];

  for (const [, { stoneMasterId, stoneName, required }] of requirements) {
    const lots = await prisma.stoneLot.findMany({
      where: {
        stoneMasterId,
        branchId,
        status: "Active",
        currentQty: { gt: 0 },
      },
    });
    const available = lots.reduce((sum, lot) => sum + lot.currentQty, 0);
    if (available < required) {
      warnings.push({
        stoneMasterId,
        stoneName,
        required,
        available,
        shortfall: required - available,
      });
    }
  }

  return warnings;
};

/** @deprecated Use checkStoneStock */
export const checkBulkStoneStock = async (
  designId: string,
  setsOrdered: number,
): Promise<StoneStockWarning[]> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    select: { branchId: true },
  });
  if (!design) return [];
  return checkStoneStock(designId, setsOrdered, design.branchId);
};

/** @deprecated Stone consumption now via issue/settle flow */
export const deductBulkStonesForProductionRun = async (): Promise<void> => {
  // No-op: stones are issued and settled during Stone Setting stage
};

export const computeBulkStoneRequirements = computeStoneRequirements;
