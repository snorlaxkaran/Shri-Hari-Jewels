import { prisma } from "./db.js";
import { getDatabaseHost, getDatabaseKind } from "./db-config.js";
import { isEinvoiceConfigured } from "./einvoice/config.js";

export const getHealthPayload = async () => {
  const databaseUrl = process.env.DATABASE_URL;
  const databaseKind = getDatabaseKind(databaseUrl);
  const databaseHost = getDatabaseHost(databaseUrl);

  let databaseConnected = false;
  let completedSales = 0;
  let soldUnits = 0;
  let availableUnits = 0;
  let lastSaleAt: string | null = null;
  let databaseError: string | null = null;

  try {
    const [salesCount, soldCount, availableCount, lastSale] = await Promise.all([
      prisma.sale.count({ where: { paymentStatus: "Completed" } }),
      prisma.inventoryUnit.count({ where: { status: "Sold" } }),
      prisma.inventoryUnit.count({ where: { status: "Available" } }),
      prisma.sale.findFirst({
        where: { paymentStatus: "Completed" },
        orderBy: { soldAt: "desc" },
        select: { soldAt: true },
      }),
    ]);

    databaseConnected = true;
    completedSales = salesCount;
    soldUnits = soldCount;
    availableUnits = availableCount;
    lastSaleAt = lastSale?.soldAt.toISOString() ?? null;
  } catch (error) {
    databaseError =
      error instanceof Error ? error.message : "Database connection failed";
  }

  const persistent =
    databaseKind === "postgresql" && databaseConnected && !databaseError;

  return {
    status: persistent ? "ok" : "degraded",
    service: "shri-hari-jewels-api",
    upiAutoCapture: Boolean(
      process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET,
    ),
    einvoiceConfigured: isEinvoiceConfigured(),
    database: {
      kind: databaseKind,
      host: databaseHost,
      connected: databaseConnected,
      persistent,
      error: databaseError,
      completedSales,
      soldUnits,
      availableUnits,
      lastSaleAt,
    },
  };
};
