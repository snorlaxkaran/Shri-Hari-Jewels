import type { Prisma } from "@prisma/client";
import { calculateTotalMetalWeight } from "../pricing/jewelry-price.js";
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
  const perSet = calculateTotalMetalWeight(
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

const resolveMetalLotId = async (
  tx: TransactionClient,
  branchId: string,
  items: RunItemForMetal[],
  design: { metal: string | null; purity: string | null },
  totalGrams: number,
): Promise<string> => {
  const selectedLotId = items.find(
    (item) => item.elementType === "Casting" && item.metalLotId,
  )?.metalLotId;

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
    return selectedLotId;
  }

  if (!design.metal || !design.purity) {
    throw new ProductionRunError(
      "Select a metal lot on a casting element before completing this run.",
    );
  }

  const matchingLots = await tx.metalLot.findMany({
    where: {
      branchId,
      metalType: design.metal,
      purity: design.purity,
      weightGrams: { gte: totalGrams },
    },
    orderBy: { weightGrams: "asc" },
  });

  if (matchingLots.length > 0) {
    return matchingLots[0].id;
  }

  const anyMatching = await tx.metalLot.findMany({
    where: { branchId, metalType: design.metal, purity: design.purity },
    orderBy: { weightGrams: "desc" },
  });

  if (anyMatching.length === 0) {
    throw new ProductionRunError(
      `No ${design.metal} ${design.purity} metal lot found. Add stock to Raw Inventory or select a lot on a casting element.`,
    );
  }

  const totalAvailable = anyMatching.reduce((sum, lot) => sum + lot.weightGrams, 0);
  throw new ProductionRunError(
    `Insufficient ${design.metal} ${design.purity} metal: need ${totalGrams}g for this run, have ${roundWeight(totalAvailable)}g across matching lots.`,
  );
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

  const lotId = await resolveMetalLotId(
    tx,
    run.branchId,
    run.items,
    design,
    totalGrams,
  );

  const lot = await tx.metalLot.findUniqueOrThrow({ where: { id: lotId } });
  const newWeight = roundWeight(lot.weightGrams - totalGrams);

  await tx.metalLot.update({
    where: { id: lot.id },
    data: { weightGrams: newWeight },
  });

  await recordMetalAuditInTx(tx, {
    stockId: lot.id,
    lotRef: lot.lotNumber,
    previousWeight: lot.weightGrams,
    newWeight,
    delta: -totalGrams,
    reason: `Production run ${run.runNo} — metal inventory (${totalGrams}g for ${run.setsOrdered} set${run.setsOrdered !== 1 ? "s" : ""})`,
    performedById: actor.id,
    performedByName: actor.name,
  });

  await tx.productionRun.update({
    where: { id: run.id },
    data: { metalInventoryDeducted: true },
  });
};
