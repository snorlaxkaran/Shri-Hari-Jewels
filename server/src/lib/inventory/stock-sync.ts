import type { Prisma } from "@prisma/client";
import { InventoryUnitStatus } from "@prisma/client";
import { getStockStatus } from "./status.js";
import { recordInventoryAuditInTx } from "./audit.js";

type TransactionClient = Prisma.TransactionClient;

export type StockSyncAuditContext = {
  reason: string;
  performedById?: string;
  performedByName: string;
  unitId?: string;
  itemCode?: string;
  previousUnitStatus?: InventoryUnitStatus;
  newUnitStatus?: InventoryUnitStatus;
};

/**
 * Recomputes Product.stock and Product.status from the count of Available units.
 * Must be called inside the same transaction that changed unit status or count.
 */
export const syncProductStockInTx = async (
  tx: TransactionClient,
  productId: string,
  audit?: StockSyncAuditContext,
): Promise<number> => {
  const product = await tx.product.findUnique({
    where: { id: productId },
    select: { stock: true },
  });

  const available = await tx.inventoryUnit.count({
    where: { productId, status: InventoryUnitStatus.Available },
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      stock: available,
      status: getStockStatus(available),
    },
  });

  if (audit) {
    if (
      audit.unitId &&
      audit.previousUnitStatus &&
      audit.newUnitStatus &&
      audit.previousUnitStatus !== audit.newUnitStatus
    ) {
      await recordInventoryAuditInTx(tx, {
        entityType: "InventoryUnit",
        entityId: audit.unitId,
        productId,
        itemCode: audit.itemCode,
        action: "StatusChange",
        previousValue: { status: audit.previousUnitStatus },
        newValue: { status: audit.newUnitStatus },
        reason: audit.reason,
        performedById: audit.performedById,
        performedByName: audit.performedByName,
      });
    }

    if (product && product.stock !== available) {
      await recordInventoryAuditInTx(tx, {
        entityType: "Product",
        entityId: productId,
        productId,
        action: "StockSync",
        previousValue: { stock: product.stock },
        newValue: { stock: available },
        reason: audit.reason,
        performedById: audit.performedById,
        performedByName: audit.performedByName,
      });
    }
  }

  return available;
};
