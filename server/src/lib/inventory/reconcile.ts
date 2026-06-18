import { prisma } from "../db.js";
import { getStockStatus } from "./status.js";

export type InventoryRepairReport = {
  unitsMarkedSold: number;
  unitsMarkedReserved: number;
  productsStockCorrected: number;
};

/**
 * Repairs inventory drift: completed sales must have Sold units,
 * pending UPI sales must have Reserved units, and product.stock
 * must match the count of Available units.
 *
 * Intended for admin repair only — not for hot-path reads.
 */
export const reconcileInventoryWithSales =
  async (): Promise<InventoryRepairReport> => {
    const soldResult = await prisma.inventoryUnit.updateMany({
      where: {
        sale: { paymentStatus: "Completed" },
        status: { not: "Sold" },
      },
      data: { status: "Sold" },
    });

    const reservedResult = await prisma.inventoryUnit.updateMany({
      where: {
        sale: { paymentStatus: "Pending" },
        status: { notIn: ["Reserved", "Sold"] },
      },
      data: { status: "Reserved" },
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
        (u) => u.status === "Available",
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
