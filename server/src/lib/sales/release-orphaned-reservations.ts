import { InventoryUnitStatus, SalePaymentStatus, WebOrderStatus, WebOrderPaymentStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { syncProductStockInTx } from "../inventory/stock-sync.js";
import { getPendingSaleTimeoutMs } from "./expire-reservations.js";
import { cancelPendingSale } from "./service.js";
import { updateWebOrder } from "../storefront/admin-service.js";

const ACTIVE_WEB_ORDER_STATUSES: WebOrderStatus[] = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
];

const loadWebReservedUnitIds = async (): Promise<Set<string>> => {
  const items = await prisma.webOrderItem.findMany({
    where: {
      webOrder: { status: { in: ACTIVE_WEB_ORDER_STATUSES } },
    },
    select: { reservedUnitIds: true },
  });

  const ids = new Set<string>();
  for (const item of items) {
    if (!Array.isArray(item.reservedUnitIds)) continue;
    for (const id of item.reservedUnitIds) {
      if (typeof id === "string" && id) ids.add(id);
    }
  }
  return ids;
};

export type ReleaseOrphanedResult = {
  releasedCount: number;
  expiredSalesCount: number;
  expiredWebOrdersCount: number;
  itemCodes: string[];
  errors: string[];
};

/**
 * Releases inventory stuck in Reserved when there is no valid reason to hold it:
 * - Expires stale pending UPI sales (same as cron)
 * - Releases Reserved units with no pending sale, no staff hold, and no active web order
 */
export const releaseStuckReservations = async (): Promise<ReleaseOrphanedResult> => {
  const cutoff = new Date(Date.now() - getPendingSaleTimeoutMs());
  const errors: string[] = [];
  const releasedItemCodes: string[] = [];
  let expiredSalesCount = 0;

  const staleSales = await prisma.sale.findMany({
    where: {
      paymentStatus: SalePaymentStatus.Pending,
      soldAt: { lt: cutoff },
    },
    orderBy: { soldAt: "asc" },
  });

  const processedCartGroups = new Set<string>();

  for (const sale of staleSales) {
    if (sale.cartGroupId) {
      if (processedCartGroups.has(sale.cartGroupId)) continue;
      processedCartGroups.add(sale.cartGroupId);
    }

    try {
      await cancelPendingSale(sale.id);
      expiredSalesCount += 1;
      releasedItemCodes.push(sale.itemCode);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown cancellation error";
      errors.push(`Sale ${sale.id} (${sale.itemCode}): ${message}`);

      try {
        await prisma.$transaction(async (tx) => {
          await tx.inventoryUnit.update({
            where: { id: sale.unitId },
            data: { status: InventoryUnitStatus.Available },
          });
          await syncProductStockInTx(tx, sale.productId, {
            reason: "stale_upi_sale_force_released",
            performedByName: "System",
            unitId: sale.unitId,
            itemCode: sale.itemCode,
            previousUnitStatus: InventoryUnitStatus.Reserved,
            newUnitStatus: InventoryUnitStatus.Available,
          });
          await tx.sale.delete({ where: { id: sale.id } });
        });
        expiredSalesCount += 1;
        releasedItemCodes.push(sale.itemCode);
      } catch (forceError) {
        const forceMessage =
          forceError instanceof Error ? forceError.message : "Force release failed";
        errors.push(`Force release ${sale.itemCode}: ${forceMessage}`);
      }
    }
  }

  let expiredWebOrdersCount = 0;
  const webOrderCutoff = new Date(Date.now() - getPendingSaleTimeoutMs());
  const staleWebOrders = await prisma.webOrder.findMany({
    where: {
      status: { in: ACTIVE_WEB_ORDER_STATUSES },
      paymentStatus: WebOrderPaymentStatus.Unpaid,
      createdAt: { lt: webOrderCutoff },
    },
    select: {
      id: true,
      organizationId: true,
      orderNo: true,
      items: { select: { reservedUnitIds: true } },
    },
  });

  for (const order of staleWebOrders) {
    try {
      await updateWebOrder(order.organizationId, order.id, {
        status: "Cancelled",
      });
      expiredWebOrdersCount += 1;
      for (const item of order.items) {
        if (!Array.isArray(item.reservedUnitIds)) continue;
        for (const unitId of item.reservedUnitIds as string[]) {
          const unit = await prisma.inventoryUnit.findUnique({
            where: { id: unitId },
            select: { itemCode: true },
          });
          if (unit) releasedItemCodes.push(unit.itemCode);
        }
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Web order cancel failed";
      errors.push(`Web order ${order.orderNo}: ${message}`);
    }
  }

  const webReserved = await loadWebReservedUnitIds();

  const orphanedUnits = await prisma.inventoryUnit.findMany({
    where: {
      status: InventoryUnitStatus.Reserved,
      heldForCustomerName: null,
      OR: [
        { sale: { is: null } },
        { sale: { paymentStatus: { not: SalePaymentStatus.Pending } } },
      ],
    },
    select: {
      id: true,
      itemCode: true,
      productId: true,
      sale: { select: { paymentStatus: true } },
    },
  });

  let releasedCount = 0;

  for (const unit of orphanedUnits) {
    if (webReserved.has(unit.id)) continue;
    if (unit.sale?.paymentStatus === SalePaymentStatus.Completed) continue;

    try {
      await prisma.$transaction(async (tx) => {
        await tx.inventoryUnit.update({
          where: { id: unit.id },
          data: { status: InventoryUnitStatus.Available },
        });
        await syncProductStockInTx(tx, unit.productId, {
          reason: "orphaned_reservation_released",
          performedByName: "System",
          unitId: unit.id,
          itemCode: unit.itemCode,
          previousUnitStatus: InventoryUnitStatus.Reserved,
          newUnitStatus: InventoryUnitStatus.Available,
        });
      });
      releasedCount += 1;
      releasedItemCodes.push(unit.itemCode);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Release failed";
      errors.push(`Unit ${unit.itemCode}: ${message}`);
    }
  }

  return {
    releasedCount,
    expiredSalesCount,
    expiredWebOrdersCount,
    itemCodes: releasedItemCodes,
    errors,
  };
};
