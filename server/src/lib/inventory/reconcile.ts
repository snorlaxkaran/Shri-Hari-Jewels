import { InventoryUnitStatus, SalePaymentStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { getStockStatus } from "./status.js";

export type InventoryReconcileReport = {
  unitsMarkedSold: number;
  unitsMarkedReserved: number;
  productsStockCorrected: number;
};

export type InventoryRepairReport = InventoryReconcileReport & {
  wholesaleSalesCreated: number;
  wholesaleSalesSkipped: number;
};

/**
 * Repairs inventory drift: completed sales must have Sold units,
 * pending UPI sales must have Reserved units, and product.stock
 * must match the count of Available units.
 *
 * Intended for admin repair only — not for hot-path reads.
 */
export const reconcileInventoryWithSales =
  async (): Promise<InventoryReconcileReport> => {
    const soldResult = await prisma.inventoryUnit.updateMany({
      where: {
        sale: { paymentStatus: SalePaymentStatus.Completed },
        status: { not: InventoryUnitStatus.Sold },
      },
      data: { status: InventoryUnitStatus.Sold },
    });

    const reservedResult = await prisma.inventoryUnit.updateMany({
      where: {
        sale: { paymentStatus: SalePaymentStatus.Pending },
        status: { notIn: [InventoryUnitStatus.Reserved, InventoryUnitStatus.Sold] },
      },
      data: { status: InventoryUnitStatus.Reserved },
    });

    const products = await prisma.product.findMany({
      select: {
        id: true,
        stock: true,
        units: { select: { status: true } },
      },
    });

    let productsStockCorrected = 0;

    for (const product of products) {
      const available = product.units.filter(
        (u) => u.status === InventoryUnitStatus.Available,
      ).length;
      if (product.stock === available) continue;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          stock: available,
          status: getStockStatus(available),
        },
      });
      productsStockCorrected += 1;
    }

    return {
      unitsMarkedSold: soldResult.count,
      unitsMarkedReserved: reservedResult.count,
      productsStockCorrected,
    };
  };
