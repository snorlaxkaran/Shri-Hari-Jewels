import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import type { BulkStoneStockWarning } from "../../types.js";

export const computeBulkStoneRequirements = async (
  designId: string,
  setsOrdered: number,
): Promise<Map<string, { sizeLabel: string; required: number }>> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: {
      elements: {
        include: {
          motif: {
            include: {
              stones: true,
            },
          },
        },
      },
    },
  });

  const requirements = new Map<string, { sizeLabel: string; required: number }>();

  if (!design) return requirements;

  for (const element of design.elements) {
    if (!element.motif?.stones.length) continue;

    for (const motifStone of element.motif.stones) {
      const needed =
        motifStone.qtyPerMotif * element.qtyPerSet * setsOrdered;
      const existing = requirements.get(motifStone.bulkStoneLotId);
      if (existing) {
        existing.required += needed;
      } else {
        const lot = await prisma.bulkStoneLot.findUnique({
          where: { id: motifStone.bulkStoneLotId },
        });
        requirements.set(motifStone.bulkStoneLotId, {
          sizeLabel: lot?.sizeLabel ?? motifStone.bulkStoneLotId,
          required: needed,
        });
      }
    }
  }

  return requirements;
};

export const checkBulkStoneStock = async (
  designId: string,
  setsOrdered: number,
): Promise<BulkStoneStockWarning[]> => {
  const requirements = await computeBulkStoneRequirements(designId, setsOrdered);
  const warnings: BulkStoneStockWarning[] = [];

  for (const [bulkStoneLotId, { sizeLabel, required }] of requirements) {
    const lot = await prisma.bulkStoneLot.findUnique({
      where: { id: bulkStoneLotId },
    });
    const available = lot?.quantity ?? 0;
    if (available < required) {
      warnings.push({
        bulkStoneLotId,
        sizeLabel,
        stoneType: lot?.stoneType,
        required,
        available,
        shortfall: required - available,
      });
    }
  }

  return warnings;
};

export const deductBulkStonesForProductionRun = async (
  designId: string,
  setsOrdered: number,
): Promise<void> => {
  const requirements = await computeBulkStoneRequirements(designId, setsOrdered);

  for (const [bulkStoneLotId, { required, sizeLabel }] of requirements) {
    const lot = await prisma.bulkStoneLot.findUnique({
      where: { id: bulkStoneLotId },
    });
    if (!lot) continue;
    if (lot.quantity < required) {
      throw new Error(
        `Insufficient bulk stones for "${sizeLabel}": need ${required}, have ${lot.quantity}.`,
      );
    }
    await prisma.bulkStoneLot.update({
      where: { id: bulkStoneLotId },
      data: { quantity: lot.quantity - required },
    });
  }
};

export const motifStoneCostForDesign = async (
  designId: string,
): Promise<number> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: {
      elements: {
        include: {
          motif: {
            include: {
              stones: {
                include: { bulkStoneLot: true },
              },
            },
          },
        },
      },
    },
  });

  if (!design) return 0;

  let total = 0;
  for (const element of design.elements) {
    const elementCost = element.unitValue
      ? moneyToNumber(String(element.unitValue)) * element.qtyPerSet
      : 0;

    if (element.motifId && element.motif?.price) {
      total += moneyToNumber(String(element.motif.price)) * element.qtyPerSet;
    } else {
      total += elementCost;
    }
  }

  return total;
};
