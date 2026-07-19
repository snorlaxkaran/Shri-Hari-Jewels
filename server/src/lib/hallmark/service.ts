import {
  HallmarkBatchStatus,
  InventoryUnitStatus,
  type Prisma,
} from "@prisma/client";
import { prisma } from "../db.js";
import { assertBranchInOrganization } from "../organizations/access.js";
import type {
  CreateHallmarkBatchInput,
  HallmarkBatchDetail,
  HallmarkBatchSummary,
  ReceiveHallmarkBatchInput,
  UpdateHallmarkBatchInput,
} from "../../types.js";
import { generateHallmarkBatchNo } from "./batch-no.js";
import { HallmarkError } from "./errors.js";
import { toHallmarkBatchDetail, toHallmarkBatchSummary } from "./mappers.js";
import {
  isHallmarked,
  requiresHallmark,
  validateHuid,
} from "./requires-hallmark.js";
import { toMoney } from "../money.js";

const batchInclude = {
  items: {
    include: {
      inventoryUnit: { include: { product: true } },
    },
    orderBy: { inventoryUnit: { itemCode: "asc" as const } },
  },
} satisfies Prisma.HallmarkBatchInclude;

const getBatchOrThrow = async (id: string, organizationId: string) => {
  const batch = await prisma.hallmarkBatch.findFirst({
    where: { id, organizationId },
    include: batchInclude,
  });
  if (!batch) throw new HallmarkError("Hallmark batch not found.", 404);
  return batch;
};

const assertUnitsEligible = async (
  organizationId: string,
  branchId: string,
  inventoryUnitIds: string[],
) => {
  const uniqueIds = [...new Set(inventoryUnitIds)];
  if (uniqueIds.length === 0) {
    throw new HallmarkError("Select at least one inventory unit.");
  }

  const units = await prisma.inventoryUnit.findMany({
    where: { id: { in: uniqueIds }, organizationId },
    include: { product: true },
  });

  if (units.length !== uniqueIds.length) {
    throw new HallmarkError("Some selected units were not found.", 404);
  }

  for (const unit of units) {
    if (unit.branchId !== branchId) {
      throw new HallmarkError(
        `${unit.itemCode} is not in the selected branch.`,
      );
    }
    if (unit.status !== InventoryUnitStatus.Available) {
      throw new HallmarkError(
        `${unit.itemCode} is ${unit.status} and cannot be hallmarked.`,
      );
    }
    if (!requiresHallmark(unit.product)) {
      throw new HallmarkError(
        `${unit.itemCode} does not require BIS hallmarking (metal/weight).`,
      );
    }
    if (isHallmarked(unit)) {
      throw new HallmarkError(`${unit.itemCode} is already hallmarked.`);
    }
  }

  const activeAssignments = await prisma.hallmarkBatchItem.findMany({
    where: {
      inventoryUnitId: { in: uniqueIds },
      batch: {
        status: {
          in: [HallmarkBatchStatus.Draft, HallmarkBatchStatus.SentToCenter],
        },
      },
    },
    select: { inventoryUnit: { select: { itemCode: true } } },
  });

  if (activeAssignments.length > 0) {
    throw new HallmarkError(
      `${activeAssignments[0]!.inventoryUnit.itemCode} is already in an open hallmark batch.`,
    );
  }

  return units;
};

export const countPendingHallmarkUnits = async (
  organizationId: string,
  branchId?: string,
): Promise<number> => {
  const units = await prisma.inventoryUnit.findMany({
    where: {
      organizationId,
      status: InventoryUnitStatus.Available,
      huid: null,
      hallmarkNumber: null,
      ...(branchId ? { branchId } : {}),
      product: {
        metal: { in: ["Gold", "Rose Gold", "Platinum"] },
        weightGrams: { gte: 2 },
      },
    },
    select: { id: true },
  });
  return units.length;
};

export const listHallmarkBatches = async (
  organizationId: string,
  branchId?: string,
): Promise<HallmarkBatchSummary[]> => {
  const rows = await prisma.hallmarkBatch.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    include: { items: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map(toHallmarkBatchSummary);
};

export const getHallmarkBatch = async (
  id: string,
  organizationId: string,
): Promise<HallmarkBatchDetail> => {
  const batch = await getBatchOrThrow(id, organizationId);
  return toHallmarkBatchDetail(batch);
};

export const createHallmarkBatch = async (
  organizationId: string,
  input: CreateHallmarkBatchInput,
  createdByName: string,
): Promise<HallmarkBatchDetail> => {
  const branchId = input.branchId.trim();
  const hallmarkCenter = input.hallmarkCenter.trim();
  if (!hallmarkCenter) {
    throw new HallmarkError("Hallmark center name is required.");
  }

  await assertBranchInOrganization(branchId, organizationId);
  await assertUnitsEligible(organizationId, branchId, input.inventoryUnitIds);

  const batchNo = await generateHallmarkBatchNo(organizationId);

  const batch = await prisma.hallmarkBatch.create({
    data: {
      organizationId,
      branchId,
      batchNo,
      hallmarkCenter,
      createdByName,
      items: {
        create: input.inventoryUnitIds.map((inventoryUnitId) => ({
          inventoryUnitId,
        })),
      },
    },
    include: batchInclude,
  });

  return toHallmarkBatchDetail(batch);
};

export const sendHallmarkBatch = async (
  id: string,
  organizationId: string,
): Promise<HallmarkBatchDetail> => {
  const batch = await getBatchOrThrow(id, organizationId);
  if (batch.status !== HallmarkBatchStatus.Draft) {
    throw new HallmarkError("Only draft batches can be marked as sent.");
  }

  const updated = await prisma.hallmarkBatch.update({
    where: { id },
    data: {
      status: HallmarkBatchStatus.SentToCenter,
      sentAt: new Date(),
    },
    include: batchInclude,
  });

  return toHallmarkBatchDetail(updated);
};

export const receiveHallmarkBatch = async (
  id: string,
  organizationId: string,
  input: ReceiveHallmarkBatchInput,
): Promise<HallmarkBatchDetail> => {
  const batch = await getBatchOrThrow(id, organizationId);
  if (
    batch.status !== HallmarkBatchStatus.SentToCenter &&
    batch.status !== HallmarkBatchStatus.PartiallyReceived
  ) {
    throw new HallmarkError("Batch must be sent to center before receiving HUIDs.");
  }

  const byUnitId = new Map(
    batch.items.map((item) => [item.inventoryUnitId, item]),
  );

  for (const entry of input.items) {
    const item = byUnitId.get(entry.inventoryUnitId);
    if (!item) {
      throw new HallmarkError("One or more items do not belong to this batch.");
    }
    validateHuid(entry.huid);
  }

  const seenHuids = new Set<string>();
  for (const entry of input.items) {
    const huid = validateHuid(entry.huid);
    if (seenHuids.has(huid)) {
      throw new HallmarkError(`Duplicate HUID in submission: ${huid}`);
    }
    seenHuids.add(huid);
  }

  const existingHuid = await prisma.inventoryUnit.findFirst({
    where: {
      organizationId,
      huid: { in: [...seenHuids] },
      id: { notIn: batch.items.map((item) => item.inventoryUnitId) },
    },
    select: { itemCode: true, huid: true },
  });
  if (existingHuid?.huid) {
    throw new HallmarkError(
      `HUID ${existingHuid.huid} is already assigned to ${existingHuid.itemCode}.`,
    );
  }

  await prisma.$transaction(async (tx) => {
    const now = new Date();
    for (const entry of input.items) {
      const huid = validateHuid(entry.huid);
      await tx.hallmarkBatchItem.updateMany({
        where: { batchId: id, inventoryUnitId: entry.inventoryUnitId },
        data: { huid, receivedAt: now },
      });
      await tx.inventoryUnit.update({
        where: { id: entry.inventoryUnitId },
        data: {
          huid,
          hallmarkNumber: huid,
          hallmarkCenter: batch.hallmarkCenter,
        },
      });
    }

    const refreshedItems = await tx.hallmarkBatchItem.findMany({
      where: { batchId: id },
    });
    const allReceived = refreshedItems.every((item) => item.huid);
    const anyReceived = refreshedItems.some((item) => item.huid);

    await tx.hallmarkBatch.update({
      where: { id },
      data: {
        status: allReceived
          ? HallmarkBatchStatus.Received
          : anyReceived
            ? HallmarkBatchStatus.PartiallyReceived
            : HallmarkBatchStatus.SentToCenter,
      },
    });
  });

  return getHallmarkBatch(id, organizationId);
};

export const updateUnitHallmark = async (
  unitId: string,
  organizationId: string,
  input: { huid: string; hallmarkCenter?: string },
  _actor: { id: string; name: string },
): Promise<{ itemCode: string; huid: string; hallmarkCenter?: string }> => {
  const huid = validateHuid(input.huid);
  const hallmarkCenter = input.hallmarkCenter?.trim() || null;

  const unit = await prisma.inventoryUnit.findFirst({
    where: { id: unitId, organizationId },
    include: { product: true },
  });

  if (!unit) {
    throw new HallmarkError("Item not found.", 404);
  }
  if (unit.status !== InventoryUnitStatus.Available) {
    throw new HallmarkError(
      `${unit.itemCode} is ${unit.status} and cannot be hallmarked.`,
    );
  }
  if (!requiresHallmark(unit.product)) {
    throw new HallmarkError(
      `${unit.itemCode} does not require BIS hallmarking (metal/weight).`,
    );
  }
  if (isHallmarked(unit)) {
    throw new HallmarkError(`${unit.itemCode} is already hallmarked.`);
  }

  const duplicate = await prisma.inventoryUnit.findFirst({
    where: { organizationId, huid, id: { not: unitId } },
    select: { itemCode: true },
  });
  if (duplicate) {
    throw new HallmarkError(
      `HUID ${huid} is already assigned to ${duplicate.itemCode}.`,
    );
  }

  await prisma.inventoryUnit.update({
    where: { id: unitId },
    data: {
      huid,
      hallmarkNumber: huid,
      hallmarkCenter,
    },
  });

  return {
    itemCode: unit.itemCode,
    huid,
    hallmarkCenter: hallmarkCenter ?? undefined,
  };
};

export const updateHallmarkBatch = async (
  id: string,
  organizationId: string,
  input: UpdateHallmarkBatchInput,
): Promise<HallmarkBatchDetail> => {
  const batch = await getBatchOrThrow(id, organizationId);
  if (batch.status === HallmarkBatchStatus.Draft) {
    throw new HallmarkError("Record the hallmarking fee after the batch is sent.");
  }

  if (input.hallmarkingFeeTotal != null) {
    const fee = input.hallmarkingFeeTotal;
    if (!Number.isFinite(fee) || fee < 0) {
      throw new HallmarkError("Hallmarking fee must be zero or greater.");
    }
  }

  const updated = await prisma.hallmarkBatch.update({
    where: { id },
    data: {
      hallmarkingFeeTotal:
        input.hallmarkingFeeTotal == null
          ? null
          : toMoney(input.hallmarkingFeeTotal),
    },
    include: batchInclude,
  });

  return toHallmarkBatchDetail(updated);
};
