import { StoneStockStatus } from "@prisma/client";
import { prisma } from "../db.js";
import type { StoneStockWarning } from "../../types.js";

export const computeStoneRequirements = async (
  designId: string,
  setsOrdered: number,
): Promise<Map<string, { stoneType: string; required: number }>> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: {
      elements: {
        include: {
          motif: {
            include: {
              stones: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  const requirements = new Map<string, { stoneType: string; required: number }>();
  if (!design) return requirements;

  for (const element of design.elements) {
    if (!element.motif?.stones.length) continue;

    for (const motifStone of element.motif.stones) {
      const needed =
        motifStone.qtyPerMotif * element.qtyPerSet * setsOrdered;
      const key = motifStone.stoneType.toLowerCase();
      const existing = requirements.get(key);
      if (existing) {
        existing.required += needed;
      } else {
        requirements.set(key, {
          stoneType: motifStone.stoneType,
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

  for (const [, { stoneType, required }] of requirements) {
    const rows = await prisma.stoneStock.findMany({
      where: {
        branchId,
        status: StoneStockStatus.Active,
        stoneType: { equals: stoneType, mode: "insensitive" },
        OR: [{ currentPieces: { gt: 0 } }, { currentWeightCt: { gt: 0 } }],
      },
    });
    const available = rows.reduce((sum, row) => sum + row.currentPieces, 0);
    if (available < required) {
      warnings.push({
        stoneType,
        required,
        available,
        shortfall: required - available,
      });
    }
  }

  return warnings;
};
