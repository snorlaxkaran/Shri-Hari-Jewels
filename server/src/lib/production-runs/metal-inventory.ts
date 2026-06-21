import type { Prisma } from "@prisma/client";
import {
  calculatePhysicalMetalWeightPerSet,
} from "../pricing/jewelry-price.js";
import { ProductionRunError } from "./errors.js";

type TransactionClient = Prisma.TransactionClient;

type Actor = { id: string; name: string };

type RunItemForMetal = {
  elementName: string;
  elementType: string;
  qtyPerSet: number;
  weightGramsPerPc: number | null;
  metalWeightGrams: number | null;
  metalLotId: string | null;
};

type RunForMetalDeduction = {
  id: string;
  runNo: string;
  branchId: string;
  setsOrdered: number;
  metalInventoryDeducted: boolean;
  items: RunItemForMetal[];
};

const roundWeight = (value: number) => Math.round(value * 100) / 100;

export const computeRunMetalWeightGrams = (
  items: RunItemForMetal[],
  setsOrdered: number,
): number => {
  const perSet = calculatePhysicalMetalWeightPerSet(
    items.map((item) => ({
      elementName: item.elementName,
      elementType: item.elementType,
      qtyPerSet: item.qtyPerSet,
      weightGramsPerPc: item.weightGramsPerPc,
      metalWeightGrams: item.metalWeightGrams,
    })),
  );
  if (perSet <= 0) return 0;
  return roundWeight(perSet * setsOrdered);
};

const recordMetalAuditInTx = async (
  tx: TransactionClient,
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

const sumLotWeight = (lots: Array<{ weightGrams: number }>) =>
  roundWeight(lots.reduce((sum, lot) => sum + lot.weightGrams, 0));

const deductFromLotInTx = async (
  tx: TransactionClient,
  lot: { id: string; lotNumber: string; weightGrams: number },
  amount: number,
  reason: string,
  actor: Actor,
) => {
  const newWeight = roundWeight(lot.weightGrams - amount);
  await tx.metalLot.update({
    where: { id: lot.id },
    data: { weightGrams: newWeight },
  });
  await recordMetalAuditInTx(tx, {
    stockId: lot.id,
    lotRef: lot.lotNumber,
    previousWeight: lot.weightGrams,
    newWeight,
    delta: -amount,
    reason,
    performedById: actor.id,
    performedByName: actor.name,
  });
};

const buildInsufficientMetalError = async (
  tx: TransactionClient,
  branchId: string,
  design: { metal: string; purity: string },
  totalGrams: number,
  matchingLots: Array<{ weightGrams: number }>,
): Promise<string> => {
  const matchingTotal = sumLotWeight(matchingLots);
  let message =
    `Insufficient ${design.metal} ${design.purity} metal: need ${totalGrams}g for this run, have ${matchingTotal}g in matching lots.`;

  if (design.metal === "Gold") {
    const allGoldLots = await tx.metalLot.findMany({
      where: { branchId, metalType: "Gold" },
      select: { weightGrams: true, purity: true },
    });
    const allGoldTotal = sumLotWeight(allGoldLots);
    if (allGoldTotal > matchingTotal) {
      message +=
        ` Raw inventory shows ${allGoldTotal}g total gold (all purities); only ${matchingTotal}g is ${design.purity}.`;
    }
  }

  return message;
};

const deductMetalAcrossLotsInTx = async (
  tx: TransactionClient,
  branchId: string,
  items: RunItemForMetal[],
  design: { metal: string; purity: string },
  totalGrams: number,
  run: { runNo: string; setsOrdered: number },
  actor: Actor,
): Promise<void> => {
  const selectedLotId = items.find(
    (item) => item.elementType === "Casting" && item.metalLotId,
  )?.metalLotId;

  const reasonBase = `Production run ${run.runNo} — metal inventory (${totalGrams}g for ${run.setsOrdered} set${run.setsOrdered !== 1 ? "s" : ""})`;

  if (selectedLotId) {
    const lot = await tx.metalLot.findUnique({ where: { id: selectedLotId } });
    if (!lot) {
      throw new ProductionRunError("Selected metal lot not found.", 404);
    }
    if (lot.branchId !== branchId) {
      throw new ProductionRunError(
        "Selected metal lot belongs to a different branch.",
      );
    }
    if (lot.weightGrams < totalGrams) {
      throw new ProductionRunError(
        `Insufficient metal in lot ${lot.lotNumber}: need ${totalGrams}g for this run, have ${lot.weightGrams}g.`,
      );
    }
    await deductFromLotInTx(tx, lot, totalGrams, reasonBase, actor);
    return;
  }

  const matchingLots = await tx.metalLot.findMany({
    where: {
      branchId,
      metalType: design.metal,
      purity: design.purity,
      weightGrams: { gt: 0 },
    },
    orderBy: { weightGrams: "desc" },
  });

  if (matchingLots.length === 0) {
    throw new ProductionRunError(
      `No ${design.metal} ${design.purity} metal lot found. Add stock to Raw Inventory or select a lot on a casting element.`,
    );
  }

  let remaining = totalGrams;
  const planned: Array<{ lot: (typeof matchingLots)[number]; amount: number }> =
    [];

  for (const lot of matchingLots) {
    if (remaining <= 0) break;
    const amount = roundWeight(Math.min(lot.weightGrams, remaining));
    if (amount <= 0) continue;
    planned.push({ lot, amount });
    remaining = roundWeight(remaining - amount);
  }

  if (remaining > 0.001) {
    throw new ProductionRunError(
      await buildInsufficientMetalError(
        tx,
        branchId,
        design,
        totalGrams,
        matchingLots,
      ),
    );
  }

  for (const { lot, amount } of planned) {
    await deductFromLotInTx(
      tx,
      lot,
      amount,
      planned.length > 1 ? `${reasonBase} (partial)` : reasonBase,
      actor,
    );
  }
};

export const deductRunMetalInventoryInTx = async (
  tx: TransactionClient,
  run: RunForMetalDeduction,
  design: { metal: string | null; purity: string | null },
  actor: Actor,
): Promise<void> => {
  if (run.metalInventoryDeducted) return;

  const totalGrams = computeRunMetalWeightGrams(run.items, run.setsOrdered);
  if (totalGrams <= 0) {
    await tx.productionRun.update({
      where: { id: run.id },
      data: { metalInventoryDeducted: true },
    });
    return;
  }

  if (!design.metal || !design.purity) {
    throw new ProductionRunError(
      "Design metal and purity must be set before completing this run.",
    );
  }

  await deductMetalAcrossLotsInTx(
    tx,
    run.branchId,
    run.items,
    { metal: design.metal, purity: design.purity },
    totalGrams,
    { runNo: run.runNo, setsOrdered: run.setsOrdered },
    actor,
  );

  await tx.productionRun.update({
    where: { id: run.id },
    data: { metalInventoryDeducted: true },
  });
};
