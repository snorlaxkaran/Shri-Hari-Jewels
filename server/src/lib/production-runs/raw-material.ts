import type { Prisma } from "@prisma/client";
import { StoneLotStatus } from "@prisma/client";
import { ProductionRunError } from "./errors.js";

type TransactionClient = Prisma.TransactionClient;

type Actor = { id: string; name: string };

type ProductionRunItemRow = {
  id: string;
  elementName: string;
  elementType: string;
  czWeight: number | null;
  castingReceived: boolean;
  metalLotId: string | null;
  stoneLotId: string | null;
  metalWeightGrams: number | null;
  rawMaterialDeducted: boolean;
};

type ProductionRunContext = {
  id: string;
  runNo: string;
  branchId: string;
};

const recordAuditInTx = async (
  tx: TransactionClient,
  input: {
    stockType: "Metal" | "Stone";
    stockId: string;
    lotRef: string;
    action: "Adjustment";
    previousValue: Record<string, unknown>;
    newValue: Record<string, unknown>;
    delta: number;
    reason: string;
    performedById?: string;
    performedByName: string;
  },
) => {
  await tx.rawStockAuditLog.create({
    data: {
      stockType: input.stockType,
      stockId: input.stockId,
      lotRef: input.lotRef,
      action: input.action,
      previousValue: JSON.stringify(input.previousValue),
      newValue: JSON.stringify(input.newValue),
      delta: input.delta,
      reason: input.reason,
      performedById: input.performedById,
      performedByName: input.performedByName,
    },
  });
};

export const itemNeedsRawMaterialDeduction = (
  item: Pick<ProductionRunItemRow, "elementType" | "metalWeightGrams" | "czWeight">,
): boolean => {
  if (item.elementType === "Stone" || item.elementType === "Motif") {
    return (item.czWeight ?? 0) > 0;
  }
  return false;
};

export const validateLotSelectionForItem = (
  item: ProductionRunItemRow,
): void => {
  if (!itemNeedsRawMaterialDeduction(item)) return;

  if (item.elementType === "Casting") {
    if (!item.metalLotId) {
      throw new ProductionRunError(
        `Select a metal lot for "${item.elementName}" before marking casting received.`,
      );
    }
    if (!item.metalWeightGrams || item.metalWeightGrams <= 0) {
      throw new ProductionRunError(
        `Enter metal weight (grams) for "${item.elementName}" before deducting stock.`,
      );
    }
    return;
  }

  if (!item.stoneLotId) {
    throw new ProductionRunError(
      `Select a stone lot for "${item.elementName}" before deducting stock.`,
    );
  }
  if (!item.czWeight || item.czWeight <= 0) {
    throw new ProductionRunError(
      `Enter stone weight (carats) for "${item.elementName}" before deducting stock.`,
    );
  }
};

export const deductRawMaterialForItemInTx = async (
  tx: TransactionClient,
  item: ProductionRunItemRow,
  run: ProductionRunContext,
  actor: Actor,
): Promise<boolean> => {
  if (item.rawMaterialDeducted || !itemNeedsRawMaterialDeduction(item)) {
    return false;
  }

  validateLotSelectionForItem(item);

  const reason = `Production run ${run.runNo} — ${item.elementName}`;

  const lot = await tx.stoneLot.findUnique({
    where: { id: item.stoneLotId! },
  });
  if (!lot) {
    throw new ProductionRunError("Selected stone lot not found.", 404);
  }
  if (lot.branchId !== run.branchId) {
    throw new ProductionRunError(
      "Selected stone lot belongs to a different branch.",
    );
  }
  if (lot.status !== StoneLotStatus.InStock) {
    throw new ProductionRunError(
      `Stone lot ${lot.certificateNumber} is ${lot.status} and cannot be consumed.`,
    );
  }

  const carats = item.czWeight!;
  if (lot.carat < carats) {
    throw new ProductionRunError(
      `Insufficient carats in lot ${lot.certificateNumber}: need ${carats}ct, have ${lot.carat}ct.`,
    );
  }

  const newCarat = lot.carat - carats;
  await tx.stoneLot.update({
    where: { id: lot.id },
    data: { carat: newCarat },
  });

  await recordAuditInTx(tx, {
    stockType: "Stone",
    stockId: lot.id,
    lotRef: lot.certificateNumber,
    action: "Adjustment",
    previousValue: { carat: lot.carat },
    newValue: { carat: newCarat },
    delta: -carats,
    reason,
    performedById: actor.id,
    performedByName: actor.name,
  });

  await tx.productionRunItem.update({
    where: { id: item.id },
    data: { rawMaterialDeducted: true },
  });

  return true;
};

export const deductPendingRawMaterialForRunInTx = async (
  tx: TransactionClient,
  run: ProductionRunContext & { items: ProductionRunItemRow[] },
  actor: Actor,
): Promise<number> => {
  let deducted = 0;

  for (const item of run.items) {
    if (item.rawMaterialDeducted || !item.castingReceived) continue;
    if (!itemNeedsRawMaterialDeduction(item)) continue;

    const didDeduct = await deductRawMaterialForItemInTx(tx, item, run, actor);
    if (didDeduct) deducted += 1;
  }

  return deducted;
};
