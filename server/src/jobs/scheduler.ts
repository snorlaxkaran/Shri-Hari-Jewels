import cron from "node-cron";
import { expireStaleReservations } from "../lib/sales/expire-reservations.js";

let expiryJobRunning = false;

export const startScheduledJobs = (): void => {
  if (process.env.DISABLE_SCHEDULED_JOBS === "true") {
    console.log("[jobs] Scheduled jobs disabled via DISABLE_SCHEDULED_JOBS");
    return;
  }

  const expiryCron = process.env.RESERVATION_EXPIRY_CRON ?? "*/5 * * * *";
  cron.schedule(expiryCron, async () => {
    if (expiryJobRunning) return;
    expiryJobRunning = true;
    try {
      const result = await expireStaleReservations();
      if (result.expiredCount > 0) {
        console.log(
          `[reservation-expiry] Expired ${result.expiredCount} stale reservation(s)`,
        );
      }
    } catch (error) {
      console.error("[reservation-expiry] Job failed:", error);
    } finally {
      expiryJobRunning = false;
    }
  });

  console.log(`[jobs] Reservation expiry scheduled (${expiryCron})`);
};
