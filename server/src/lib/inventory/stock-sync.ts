import type { Prisma } from "@prisma/client";
import { getStockStatus } from "./status.js";

type TransactionClient = Prisma.TransactionClient;

/**
 * Recomputes Product.stock and Product.status from the count of Available units.
 * Must be called inside the same transaction that changed unit status or count.
 */
export const syncProductStockInTx = async (
  tx: TransactionClient,
  productId: string,
): Promise<number> => {
  const available = await tx.inventoryUnit.count({
    where: { productId, status: "Available" },
  });

  await tx.product.update({
    where: { id: productId },
    data: {
      stock: available,
      status: getStockStatus(available),
    },
  });

  return available;
};
