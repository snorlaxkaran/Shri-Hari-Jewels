import { prisma } from "../db.js";
import { getStockStatus } from "./status.js";

/**
 * Repairs inventory drift: completed sales must have Sold units,
 * pending UPI sales must have Reserved units, and product.stock
 * must match the count of Available units.
 */
export const reconcileInventoryWithSales = async (): Promise<void> => {
  await prisma.inventoryUnit.updateMany({
    where: {
      sale: { paymentStatus: "Completed" },
      status: { not: "Sold" },
    },
    data: { status: "Sold" },
  });

  await prisma.inventoryUnit.updateMany({
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

  for (const product of products) {
    const available = product.units.filter((u) => u.status === "Available").length;
    if (product.stock === available) continue;

    await prisma.product.update({
      where: { id: product.id },
      data: {
        stock: available,
        status: getStockStatus(available),
      },
    });
  }
};
