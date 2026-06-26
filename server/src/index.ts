// Hello
import "dotenv/config";
import cors from "cors";
import express from "express";
import { assertProductionDatabase } from "./lib/db-config.js";
import { getHealthPayload } from "./lib/health.js";
import { authRouter } from "./routes/auth.js";
import { branchesRouter } from "./routes/branches.js";
import { customersRouter } from "./routes/customers.js";
import { inventoryRouter } from "./routes/inventory.js";
import { invoicesRouter } from "./routes/invoices.js";
import { ordersRouter } from "./routes/orders.js";
import { paymentsRouter } from "./routes/payments.js";
import { salesRouter } from "./routes/sales.js";
import { rawInventoryRouter } from "./routes/raw-inventory.js";
import { settingsRouter } from "./routes/settings.js";
import { workOrdersRouter } from "./routes/work-orders.js";
import { designsRouter } from "./routes/designs.js";
import { motifsRouter } from "./routes/motifs.js";
import { bulkStoneLotsRouter } from "./routes/bulk-stone-lots.js";
import { stoneMasterRouter } from "./routes/stone-master.js";
import { stoneLotsRouter } from "./routes/stone-lots.js";
import { catalogRouter } from "./routes/catalog.js";
import { productionRunsRouter } from "./routes/production-runs.js";
import { usersRouter } from "./routes/users.js";
import { organizationsRouter } from "./routes/organizations.js";
import { marketRatesRouter } from "./routes/market-rates.js";
import { startScheduledJobs } from "./jobs/scheduler.js";

const syncMotifPricesOnStartup = async () => {
  try {
    const { recalculateAllMotifPrices } = await import(
      "./lib/motifs/service.js"
    );
    const count = await recalculateAllMotifPrices(
      undefined,
      "Startup sync from market rates",
    );
    if (count > 0) {
      console.log(`[motifs] Synced ${count} motif price(s) to current market rates`);
    }
  } catch (error) {
    console.warn(
      "[motifs] Could not sync motif prices on startup:",
      error instanceof Error ? error.message : error,
    );
  }
};

const app = express();
const port = Number(process.env.PORT) || 4000;
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";

assertProductionDatabase();

const allowedOrigins = new Set(
  clientUrl
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean),
);
allowedOrigins.add("http://localhost:3000");

const isAllowedOrigin = (origin: string | undefined): boolean => {
  if (!origin) return true;
  if (allowedOrigins.has(origin)) return true;
  try {
    const { hostname } = new URL(origin);
    return hostname === "localhost" || hostname.endsWith(".vercel.app");
  } catch {
    return false;
  }
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
    },
  });
});

app.use("/api/auth", authRouter);
app.use("/api/organizations", organizationsRouter);

app.use("/api/branches", branchesRouter);
app.use("/api/inventory", inventoryRouter);
app.use("/api/raw-inventory", rawInventoryRouter);
app.use("/api/customers", customersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/work-orders", workOrdersRouter);
app.use("/api/designs", designsRouter);
app.use("/api/motifs", motifsRouter);
app.use("/api/bulk-stone-lots", bulkStoneLotsRouter);
app.use("/api/stone-master", stoneMasterRouter);
app.use("/api/stone-lots", stoneLotsRouter);
app.use("/api/catalog", catalogRouter);
app.use("/api/production-runs", productionRunsRouter);
app.use("/api/sales", salesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/market-rates", marketRatesRouter);
app.use("/api/users", usersRouter);

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
  startScheduledJobs();
  void syncMotifPricesOnStartup();
});
