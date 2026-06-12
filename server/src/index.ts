import "dotenv/config";
import cors from "cors";
import express from "express";
import { authRouter } from "./routes/auth.js";
import { customersRouter } from "./routes/customers.js";
import { inventoryRouter } from "./routes/inventory.js";
import { invoicesRouter } from "./routes/invoices.js";
import { ordersRouter } from "./routes/orders.js";
import { paymentsRouter } from "./routes/payments.js";
import { salesRouter } from "./routes/sales.js";
import { rawInventoryRouter } from "./routes/raw-inventory.js";
import { settingsRouter } from "./routes/settings.js";

const app = express();
const port = Number(process.env.PORT) || 4000;
const clientUrl = process.env.CLIENT_URL ?? "http://localhost:3000";

app.use(
  cors({
    origin: clientUrl,
    credentials: true,
  }),
);

app.use(
  "/api/payments/razorpay/webhook",
  express.raw({ type: "application/json" }),
  paymentsRouter,
);

app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "shri-hari-jewels-api",
    upiAutoCapture: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
    ),
  });
});

app.use("/api/auth", authRouter);

app.use("/api/inventory", inventoryRouter);
app.use("/api/raw-inventory", rawInventoryRouter);
app.use("/api/customers", customersRouter);
app.use("/api/orders", ordersRouter);
app.use("/api/sales", salesRouter);
app.use("/api/invoices", invoicesRouter);
app.use("/api/settings", settingsRouter);

app.listen(port, () => {
  console.log(`API running at http://localhost:${port}`);
});
