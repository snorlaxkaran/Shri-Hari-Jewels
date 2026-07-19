// Hell
import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { pinoHttp } from "pino-http";
import * as Sentry from "@sentry/node";
import { assertProductionDatabase } from "./lib/db-config.js";
import { validateEinvoiceEnvironment } from "./lib/einvoice/config.js";
import { getHealthPayload } from "./lib/health.js";
import { logger } from "./lib/logger.js";
import { authRouter } from "./routes/auth.js";
import { branchesRouter } from "./routes/branches.js";
import { customersRouter } from "./routes/customers.js";
import { inventoryRouter } from "./routes/inventory.js";
import { entryVouchersRouter } from "./routes/entry-vouchers.js";
import { invoicesRouter } from "./routes/invoices.js";
import { publicInvoicesRouter } from "./routes/public-invoices.js";
import { ordersRouter } from "./routes/orders.js";
import { paymentsRouter } from "./routes/payments.js";
import { salesRouter } from "./routes/sales.js";
import { rawInventoryRouter } from "./routes/raw-inventory.js";
import { settingsRouter } from "./routes/settings.js";
import { workOrdersRouter } from "./routes/work-orders.js";
import { repairsRouter } from "./routes/repairs.js";
import { vendorsRouter } from "./routes/vendors.js";
import { productCollectionsRouter } from "./routes/product-collections.js";
import { purchaseBillsRouter } from "./routes/purchase-bills.js";
import { tallyRouter } from "./routes/tally.js";
import { designsRouter } from "./routes/designs.js";
import { motifsRouter } from "./routes/motifs.js";
import { stoneStockRouter } from "./routes/stone-stock.js";
import { stoneTypesRouter } from "./routes/stone-types.js";
import { catalogRouter } from "./routes/catalog.js";
import { productionRunsRouter } from "./routes/production-runs.js";
import { usersRouter } from "./routes/users.js";
import { organizationsRouter } from "./routes/organizations.js";
import { marketRatesRouter } from "./routes/market-rates.js";
import { auditRouter } from "./routes/audit.js";
import { approvalsRouter } from "./routes/approvals.js";
import { notificationsRouter } from "./routes/notifications.js";
import { searchRouter } from "./routes/search.js";
import { reportsRouter } from "./routes/reports.js";
import { leadsRouter } from "./routes/leads.js";
import { exchangeRouter } from "./routes/exchange.js";
import { schemesRouter } from "./routes/schemes.js";
import { karigarRouter } from "./routes/karigar.js";
import { einvoiceRouter } from "./routes/einvoice.js";
import { onboardingRouter } from "./routes/onboarding.js";
import { storefrontRouter } from "./routes/storefront.js";
import { storefrontAdminRouter } from "./routes/storefront-admin.js";
import { hallmarkBatchesRouter } from "./routes/hallmark-batches.js";
import { expensesRouter, pettyCashFloatRouter } from "./routes/expenses.js";
import { startScheduledJobs } from "./jobs/scheduler.js";
import { startLeadReminderJob } from "./lib/leads/reminder-job.js";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? "development",
    tracesSampleRate: 0.1,
  });
}

const syncMotifPricesOnStartup = async () => {
  try {
    const { recalculateAllMotifPrices } =
      await import("./lib/motifs/service.js");
    const count = await recalculateAllMotifPrices(
      undefined,
      "Startup sync from market rates",
    );
    if (count > 0) {
      logger.info({ count }, "[motifs] Synced motif prices to current market rates");
    }
  } catch (error) {
    logger.warn(
      { err: error instanceof Error ? error.message : error },
      "[motifs] Could not sync motif prices on startup",
    );
  }
};

const app = express();
const port = Number(process.env.PORT) || 4000;
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";
const isProduction = process.env.NODE_ENV === "production";

assertProductionDatabase();
validateEinvoiceEnvironment();

app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false,
  crossOriginEmbedderPolicy: false,
}));

app.use(pinoHttp({ logger }));

const allowedOrigins = new Set(
  clientUrl
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
);
allowedOrigins.add("http://localhost:3000");

const extraOrigins = (process.env.CORS_EXTRA_ORIGINS ?? "")
  .split(",")
  .map((url) => url.trim())
  .filter(Boolean);
for (const origin of extraOrigins) {
  allowedOrigins.add(origin);
}

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  if (!isProduction) {
    try {
      const { hostname } = new URL(origin);
      return hostname === "localhost";
    } catch {
      return false;
    }
  }
  return false;
};

app.use(
  cors({
    origin: (origin, callback) => {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`Origin not allowed by CORS: ${origin}`));
    },
    credentials: true,
    exposedHeaders: ["X-Transfer-Data"],
  }),
);

app.use(
  "/api/payments/razorpay/webhook",
  express.raw({ type: "application/json" }),
  paymentsRouter,
);

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", async (_req, res) => {
  const payload = await getHealthPayload();
  res.status(payload.database.persistent ? 200 : 503).json({
    ...payload,
    features: {
      motifs: true,
      security: true,
      reports: true,
      storefront: true,
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationsRouter);
app.use("/api/branches", branchesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/entry-vouchers", entryVouchersRouter);
app.use("/api/raw-inventory", rawInventoryRouter);
app.use("/api/customers", customersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/work-orders", workOrdersRouter);
app.use("/api/repairs", repairsRouter);
app.use("/api/vendors", vendorsRouter);
app.use("/api/product-collections", productCollectionsRouter);
app.use("/api/purchase-bills", purchaseBillsRouter);
app.use("/api/tally", tallyRouter);
app.use("/api/designs", designsRouter);
app.use("/api/motifs", motifsRouter);
app.use("/api/stone-stock", stoneStockRouter);
app.use("/api/stone-types", stoneTypesRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/production-runs", productionRunsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/public", publicInvoicesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/market-rates", marketRatesRouter);
app.use("/api/users", usersRouter);
app.use("/api/audit", auditRouter);
app.use("/api/approvals", approvalsRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/search", searchRouter);
app.use("/api/leads", leadsRouter);
app.use("/api/reports", reportsRouter);
app.use("/api/exchange", exchangeRouter);
app.use("/api/schemes", schemesRouter);
app.use("/api/karigar", karigarRouter);
app.use("/api/einvoice", einvoiceRouter);
app.use("/api/onboarding", onboardingRouter);
app.use("/api/hallmark-batches", hallmarkBatchesRouter);
app.use("/api/expenses", expensesRouter);
app.use("/api/petty-cash-float", pettyCashFloatRouter);
app.use("/api/storefront", storefrontRouter);
app.use("/api/storefront-admin", storefrontAdminRouter);

if (process.env.SENTRY_DSN) {
  Sentry.setupExpressErrorHandler(app);
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  logger.error({ err }, "Unhandled error");
  res.status(500).json({ error: "Internal server error." });
});

app.listen(port, () => {
  logger.info({ port }, "API running");
  startScheduledJobs();
  startLeadReminderJob();
  void syncMotifPricesOnStartup();
});
