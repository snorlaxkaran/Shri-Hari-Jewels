import type { Prisma } from "@prisma/client";
import type { FinishedGoodsInput } from "../../types.js";
import { prisma } from "../db.js";
import { ProductionRunError } from "./errors.js";
import {
  assertPositiveFinishedGoodsWeight,
  calculateFinishedGoodsForRunInTx,
  createFinishedGoodsInTx,
  repairProductSkuFromDesignInTx,
  repairProductWeightFromProductionRunInTx,
  RUN_FOR_FINISHED_GOODS_INCLUDE,
} from "./finished-goods.js";
import { deductRunMetalInventoryInTx } from "./metal-inventory.js";
import { deductPendingRawMaterialForRunInTx } from "./raw-material.js";

type TransactionClient = Prisma.TransactionClient;
type Actor = { id: string; name: string };

/** Run completion touches many tables over the network — default 5s Prisma tx timeout is too low. */
export const PRODUCTION_RUN_COMPLETION_TX_OPTIONS = {
  maxWait: 10_000,
  timeout: 30_000,
} as const;

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
  const run = await client.productionRun.findUniqueOrThrow({
    where: { id: runId },
    include: RUN_FOR_FINISHED_GOODS_INCLUDE,
  });

  const calculated = await calculateFinishedGoodsForRunInTx(
    client,
    runId,
    run.branchId,
  );

  assertPositiveFinishedGoodsWeight(calculated.weightGrams);

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
  const run = await prisma.productionRun.findUniqueOrThrow({
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
      designId: run.designId,
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
      finishedGoods ?? (await buildAutoFinishedGoodsInput(runId));
    assertPositiveFinishedGoodsWeight(input.weightGrams);
    await createFinishedGoodsInTx(
      tx,
      {
        id: run.id,
        runNo: run.runNo,
        organizationId: run.organizationId,
        branchId: run.branchId,
        setsOrdered: run.setsOrdered,
        designCode: run.design.code,
        finishedGoodsProductId: run.finishedGoodsProductId,
      },
      input,
      actor,
    );
  }
};

export const finalizeProductionRunAfterTx = async (): Promise<void> => {
  // Stone consumption handled via issue/settle during Stone Setting stage
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

  const finishedGoods = await buildAutoFinishedGoodsInput(runId);

  await prisma.$transaction(
    async (tx) => {
      await finalizeProductionRunInTx(tx, runId, actor, finishedGoods);
    },
    PRODUCTION_RUN_COMPLETION_TX_OPTIONS,
  );
  return true;
};

export const repairCompletedRunInventorySkus = async (): Promise<number> => {
  const runs = await prisma.productionRun.findMany({
    where: { finishedGoodsProductId: { not: null } },
    select: {
      id: true,
      organizationId: true,
      branchId: true,
      finishedGoodsProductId: true,
      design: { select: { code: true } },
    },
  });

  let repaired = 0;
  for (const run of runs) {
    if (!run.finishedGoodsProductId) continue;

    const didRepair = await prisma.$transaction(async (tx) => {
      const skuRepaired = await repairProductSkuFromDesignInTx(
        tx,
        run.finishedGoodsProductId!,
        run.organizationId,
        run.design.code,
      );
      const weightRepaired = await repairProductWeightFromProductionRunInTx(
        tx,
        run.finishedGoodsProductId!,
        run.id,
        run.branchId,
      );
      return skuRepaired || weightRepaired;
    });
    if (didRepair) repaired += 1;
  }

  const zeroWeightProducts = await prisma.product.findMany({
    where: {
      weightGrams: { lte: 0 },
      productionRunId: { not: null },
    },
    select: {
      id: true,
      productionRunId: true,
      branchId: true,
    },
  });

  for (const product of zeroWeightProducts) {
    if (!product.productionRunId) continue;

    const didRepair = await prisma.$transaction(async (tx) =>
      repairProductWeightFromProductionRunInTx(
        tx,
        product.id,
        product.productionRunId!,
        product.branchId,
      ),
    );
    if (didRepair) repaired += 1;
  }

  return repaired;
};
