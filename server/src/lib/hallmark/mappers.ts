import type { HallmarkBatch, HallmarkBatchItem, InventoryUnit, Product } from "@prisma/client";
import type { HallmarkBatchDetail, HallmarkBatchSummary } from "../../types.js";
import { moneyToNumber } from "../money.js";

type BatchWithItems = HallmarkBatch & {
  items: Array<
    HallmarkBatchItem & {
      inventoryUnit: InventoryUnit & { product: Product };
    }
  >;
};

export const toHallmarkBatchSummary = (
  batch: HallmarkBatch & { items: HallmarkBatchItem[] },
): HallmarkBatchSummary => ({
  id: batch.id,
  batchNo: batch.batchNo,
  branchId: batch.branchId,
  hallmarkCenter: batch.hallmarkCenter,
  status: batch.status,
  sentAt: batch.sentAt?.toISOString(),
  itemCount: batch.items.length,
  receivedCount: batch.items.filter((item) => item.huid).length,
  hallmarkingFeeTotal: batch.hallmarkingFeeTotal
    ? moneyToNumber(batch.hallmarkingFeeTotal)
    : undefined,
  createdByName: batch.createdByName,
  createdAt: batch.createdAt.toISOString(),
});

export const toHallmarkBatchDetail = (batch: BatchWithItems): HallmarkBatchDetail => ({
  ...toHallmarkBatchSummary(batch),
  items: batch.items.map((item) => ({
    id: item.id,
    inventoryUnitId: item.inventoryUnitId,
    itemCode: item.inventoryUnit.itemCode,
    productName: item.inventoryUnit.product.name,
    sku: item.inventoryUnit.product.sku,
    metal: item.inventoryUnit.product.metal,
    purity: item.inventoryUnit.product.purity,
    weightGrams: item.inventoryUnit.product.weightGrams,
    huid: item.huid ?? undefined,
    receivedAt: item.receivedAt?.toISOString(),
  })),
});
