import { prisma } from "../db.js";
import { cancelPendingSale } from "./service.js";

export type ReservationExpiryResult = {
  expiredCount: number;
  errors: string[];
};

export const getPendingSaleTimeoutMs = (): number => {
  const minutes = Number(process.env.PENDING_SALE_TIMEOUT_MINUTES ?? "15");
  if (!Number.isFinite(minutes) || minutes <= 0) return 15 * 60 * 1000;
  return minutes * 60 * 1000;
};

export const expireStaleReservations = async (): Promise<ReservationExpiryResult> => {
  const cutoff = new Date(Date.now() - getPendingSaleTimeoutMs());

  const staleSales = await prisma.sale.findMany({
    where: {
      paymentStatus: "Pending",
      soldAt: { lt: cutoff },
    },
    orderBy: { soldAt: "asc" },
  });

  const processedCartGroups = new Set<string>();
  let expiredCount = 0;
  const errors: string[] = [];

  for (const sale of staleSales) {
    if (sale.cartGroupId) {
      if (processedCartGroups.has(sale.cartGroupId)) continue;
      processedCartGroups.add(sale.cartGroupId);
    }

    try {
      await cancelPendingSale(sale.id);
      expiredCount += 1;
      console.log(
        `[reservation-expiry] Cancelled stale pending sale ${sale.id}` +
          (sale.cartGroupId
            ? ` (cart ${sale.cartGroupId}, item ${sale.itemCode})`
            : ` (item ${sale.itemCode})`) +
          ` — older than ${cutoff.toISOString()}`,
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown cancellation error";
      errors.push(`Sale ${sale.id}: ${message}`);
      console.error(
        `[reservation-expiry] Failed to cancel sale ${sale.id}: ${message}`,
      );
    }
  }

  return { expiredCount, errors };
};
