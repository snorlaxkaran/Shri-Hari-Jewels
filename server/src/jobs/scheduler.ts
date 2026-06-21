import cron from "node-cron";
import { expireStaleReservations } from "../lib/sales/expire-reservations.js";
import { runIntegrityReport } from "../lib/integrity/report.js";
import { fetchLiveRates, persistRates } from "../lib/market-rates/service.js";

let expiryJobRunning = false;
let integrityJobRunning = false;
let rateFetchJobRunning = false;

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

  const integrityCron = process.env.INTEGRITY_REPORT_CRON ?? "0 2 * * *";
  cron.schedule(integrityCron, async () => {
    if (integrityJobRunning) return;
    integrityJobRunning = true;
    try {
      await runIntegrityReport();
    } catch (error) {
      console.error("[integrity-report] Job failed:", error);
    } finally {
      integrityJobRunning = false;
    }
  });

  const rateCron = process.env.RATE_FETCH_CRON ?? "0 9 * * 1-6";
  cron.schedule(rateCron, async () => {
    if (rateFetchJobRunning) return;
    rateFetchJobRunning = true;
    try {
      const rates = await fetchLiveRates();
      await persistRates(rates);
      console.log(
        `[rates] Fetched: 22K Gold ₹${rates.gold22k}/g, 925 Silver ₹${rates.silver925}/g`,
      );
    } catch (error) {
      console.error("[rates] Auto-fetch failed — admin override required:", error);
    } finally {
      rateFetchJobRunning = false;
    }
  });

  console.log(
    `[jobs] Reservation expiry (${expiryCron}); integrity report (${integrityCron}); market rates (${rateCron})`,
  );
};
