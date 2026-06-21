import type { Prisma } from "@prisma/client";
import type { FinishedGoodsInput } from "../../types.js";
import { prisma } from "../db.js";
import { deductBulkStonesForProductionRun } from "./bulk-stone-stock.js";
import { ProductionRunError } from "./errors.js";
import {
  buildFinishedGoodsFromRun,
  createFinishedGoodsInTx,
  repairProductSkuFromDesignInTx,
} from "./finished-goods.js";
import { deductRunMetalInventoryInTx } from "./metal-inventory.js";
import { deductPendingRawMaterialForRunInTx } from "./raw-material.js";

type TransactionClient = Prisma.TransactionClient;
type Actor = { id: string; name: string };

const runForFinishedGoodsInclude = {
  design: {
    select: {
      code: true,
      name: true,
      category: true,
      metal: true,
      purity: true,
      makingChargesPerSet: true,
      finishedPhotoUrl: true,
      finishedPhotoUrls: true,
    },
  },
  items: {
    orderBy: { sortOrder: "asc" as const },
    select: {
      elementName: true,
      elementType: true,
      qtyPerSet: true,
      unitValue: true,
      weightGramsPerPc: true,
      metalWeightGrams: true,
      metalLotId: true,
      czWeight: true,
    },
  },
};

const designPhotosToImages = (design: {
  finishedPhotoUrl: string | null;
  finishedPhotoUrls: string[];
}): FinishedGoodsInput["images"] => {
  const urls = [
    ...design.finishedPhotoUrls,
    ...(design.finishedPhotoUrl ? [design.finishedPhotoUrl] : []),
  ].filter((url, index, all) => url && all.indexOf(url) === index);

  return urls.map((url, index) => ({
    url,
    name: `Design photo ${index + 1}`,
  })) as FinishedGoodsInput["images"];
};

export const buildAutoFinishedGoodsInput = async (
  runId: string,
  tx?: TransactionClient,
): Promise<FinishedGoodsInput> => {
  const client = tx ?? prisma;
  const run = await client.productionRun.findUnique({
    where: { id: runId },
    include: runForFinishedGoodsInclude,
  });
  if (!run) {
    throw new ProductionRunError("Production run not found.", 404);
  }

  const metalLots = await client.metalLot.findMany({
    where: { branchId: run.branchId },
    select: {
      id: true,
      metalType: true,
      purity: true,
      currentRate: true,
    },
  });

  const calculated = buildFinishedGoodsFromRun(run, metalLots);

  return {
    name: calculated.name,
    category: calculated.category,
    metal: calculated.metal,
    purity: calculated.purity,
    weightGrams: calculated.weightGrams,
    makingCharges: calculated.makingCharges,
    stoneCarat: calculated.stoneCarat,
    price: calculated.price,
    images: designPhotosToImages(run.design),
  };
};

export const finalizeProductionRunInTx = async (
  tx: TransactionClient,
  runId: string,
  actor: Actor,
  finishedGoods?: FinishedGoodsInput,
): Promise<void> => {
  const run = await tx.productionRun.findUniqueOrThrow({
    where: { id: runId },
    include: {
      items: true,
      design: { select: { code: true, metal: true, purity: true } },
    },
  });

  await deductRunMetalInventoryInTx(
    tx,
    {
      id: run.id,
      runNo: run.runNo,
      branchId: run.branchId,
      setsOrdered: run.setsOrdered,
      metalInventoryDeducted: run.metalInventoryDeducted,
      items: run.items,
    },
    { metal: run.design.metal, purity: run.design.purity },
    actor,
  );

  await deductPendingRawMaterialForRunInTx(
    tx,
    {
      id: run.id,
      runNo: run.runNo,
      branchId: run.branchId,
      items: run.items,
    },
    actor,
  );

  if (!run.finishedGoodsProductId) {
    const input =
      finishedGoods ?? (await buildAutoFinishedGoodsInput(runId, tx));
    await createFinishedGoodsInTx(
      tx,
      {
        id: run.id,
        runNo: run.runNo,
        branchId: run.branchId,
        setsOrdered: run.setsOrdered,
        designCode: run.design.code,
        finishedGoodsProductId: run.finishedGoodsProductId,
      },
      input,
    );
  }
};

export const finalizeProductionRunAfterTx = async (
  designId: string,
  setsOrdered: number,
): Promise<void> => {
  await deductBulkStonesForProductionRun(designId, setsOrdered);
};

export const ensureCompletedRunInventory = async (
  runId: string,
  actor: Actor,
): Promise<boolean> => {
  const run = await prisma.productionRun.findUnique({
    where: { id: runId },
    select: {
      id: true,
      designId: true,
      setsOrdered: true,
      status: true,
      finishedGoodsProductId: true,
    },
  });
  if (!run || run.status !== "Completed" || run.finishedGoodsProductId) {
    return false;
  }

  await prisma.$transaction(async (tx) => {
    await finalizeProductionRunInTx(tx, runId, actor);
  });
  return true;
};

export const repairCompletedRunInventorySkus = async (): Promise<number> => {
  const runs = await prisma.productionRun.findMany({
    where: { finishedGoodsProductId: { not: null } },
    select: {
      finishedGoodsProductId: true,
      design: { select: { code: true } },
    },
  });

  let repaired = 0;
  for (const run of runs) {
    if (!run.finishedGoodsProductId) continue;

    const didRepair = await prisma.$transaction(async (tx) =>
      repairProductSkuFromDesignInTx(
        tx,
        run.finishedGoodsProductId!,
        run.design.code,
      ),
    );
    if (didRepair) repaired += 1;
  }

  return repaired;
};
