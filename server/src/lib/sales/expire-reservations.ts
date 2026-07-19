import { prisma } from "../db.js";
import { releaseStuckReservations } from "./release-orphaned-reservations.js";

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
  const result = await releaseStuckReservations();
  return {
    expiredCount:
      result.expiredSalesCount + result.releasedCount + result.expiredWebOrdersCount,
    errors: result.errors,
  };
};
