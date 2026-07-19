/**
 * Full ERP read-only audit — inventory, pricing, sales integrity, stock valuation.
 * Run: npx tsx scripts/run-erp-audit.ts
 */
import "dotenv/config";
import {
  InventoryUnitStatus,
  SalePaymentStatus,
} from "@prisma/client";
import { prisma } from "../src/lib/db.js";
import { runIntegrityReport } from "../src/lib/integrity/report.js";
import {
  fetchAvailableUnitsForValuation,
  resolveAvailableUnitValue,
} from "../src/lib/inventory/stock-valuation.js";
import {
  computeLiveListPriceForProduct,
  resolveUnitDisplayPrice,
} from "../src/lib/inventory/unit-pricing.js";
import { getCurrentMarketRates } from "../src/lib/market-rates/service.js";
import { moneyToNumber } from "../src/lib/money.js";

type AuditIssue = {
  section: string;
  id: string;
  kind: string;
  detail: string;
};

const section = (title: string) => {
  console.log("");
  console.log(`=== ${title} ===`);
};

const main = async () => {
  const issues: AuditIssue[] = [];
  const started = Date.now();

  section("ERP snapshot");
  const [
    productCount,
    unitCount,
    availableUnits,
    soldUnits,
    reservedUnits,
    completedSales,
    pendingSales,
    productionRuns,
    metalLots,
  ] = await Promise.all([
    prisma.product.count(),
    prisma.inventoryUnit.count(),
    prisma.inventoryUnit.count({ where: { status: InventoryUnitStatus.Available } }),
    prisma.inventoryUnit.count({ where: { status: InventoryUnitStatus.Sold } }),
    prisma.inventoryUnit.count({ where: { status: InventoryUnitStatus.Reserved } }),
    prisma.sale.count({ where: { paymentStatus: SalePaymentStatus.Completed } }),
    prisma.sale.count({ where: { paymentStatus: SalePaymentStatus.Pending } }),
    prisma.productionRun.count(),
    prisma.metalLot.count(),
  ]);

  console.log(`Products: ${productCount}`);
  console.log(`Inventory units: ${unitCount} (available ${availableUnits}, sold ${soldUnits}, reserved ${reservedUnits})`);
  console.log(`Sales: ${completedSales} completed, ${pendingSales} pending`);
  console.log(`Production runs: ${productionRuns}`);
  console.log(`Metal lots: ${metalLots}`);

  const marketRates = await getCurrentMarketRates();
  console.log(`Gold 22K rate: ${marketRates.gold22k ?? "not set"}`);
  console.log(`Silver 925 rate: ${marketRates.silver925 ?? "not set"}`);

  section("Integrity checks");
  const integrityMismatches = await runIntegrityReport({ log: false });
  if (integrityMismatches.length === 0) {
    console.log("No integrity mismatches.");
  } else {
    console.log(`Found ${integrityMismatches.length} integrity issue(s):`);
    for (const mismatch of integrityMismatches.slice(0, 25)) {
      console.log(
        `- [${mismatch.category}] ${mismatch.message}` +
          (mismatch.expected
            ? ` (expected ${mismatch.expected}, actual ${mismatch.actual})`
            : ""),
      );
      issues.push({
        section: "integrity",
        id: mismatch.entityId ?? mismatch.entityType,
        kind: mismatch.category,
        detail: mismatch.message,
      });
    }
    if (integrityMismatches.length > 25) {
      console.log(`… and ${integrityMismatches.length - 25} more`);
    }
  }

  section("Inventory ↔ sales alignment (preview)");
  const [soldMismatch, reservedMismatch] = await Promise.all([
    prisma.inventoryUnit.count({
      where: {
        sale: { paymentStatus: SalePaymentStatus.Completed },
        status: { not: InventoryUnitStatus.Sold },
      },
    }),
    prisma.inventoryUnit.count({
      where: {
        sale: { paymentStatus: SalePaymentStatus.Pending },
        status: { notIn: [InventoryUnitStatus.Reserved, InventoryUnitStatus.Sold] },
      },
    }),
  ]);

  // stock mismatch via explicit loop (Prisma can't compare stock to count inline)
  const productsForStock = await prisma.product.findMany({
    select: {
      id: true,
      sku: true,
      stock: true,
      units: { select: { status: true } },
    },
  });
  let productStockDrift = 0;
  for (const product of productsForStock) {
    const available = product.units.filter(
      (u) => u.status === InventoryUnitStatus.Available,
    ).length;
    if (product.stock !== available) productStockDrift += 1;
  }

  console.log(`Units that should be Sold: ${soldMismatch}`);
  console.log(`Units that should be Reserved: ${reservedMismatch}`);
  console.log(`Products with stock count drift: ${productStockDrift}`);
  if (soldMismatch > 0) {
    issues.push({
      section: "inventory",
      id: "sales",
      kind: "sold-status-drift",
      detail: `${soldMismatch} unit(s) linked to completed sales are not Sold`,
    });
  }
  if (reservedMismatch > 0) {
    issues.push({
      section: "inventory",
      id: "sales",
      kind: "reserved-status-drift",
      detail: `${reservedMismatch} unit(s) linked to pending sales are not Reserved`,
    });
  }
  if (productStockDrift > 0) {
    issues.push({
      section: "inventory",
      id: "products",
      kind: "product-stock-drift",
      detail: `${productStockDrift} product(s) have stock != available unit count`,
    });
  }

  section("Unit pricing");
  const units = await prisma.inventoryUnit.findMany({
    include: { product: true, sale: true },
    orderBy: { itemCode: "asc" },
  });

  for (const unit of units) {
    const { price, priceSource } = resolveUnitDisplayPrice(
      unit,
      unit.product,
      marketRates,
    );

    if (unit.sale) {
      const saleListPrice = moneyToNumber(unit.sale.listPrice);
      if (Math.abs(price - saleListPrice) > 0.01) {
        issues.push({
          section: "pricing",
          id: unit.itemCode,
          kind: "sold-price-mismatch",
          detail: `Display ${price} != sale.listPrice ${saleListPrice}`,
        });
      } else if (priceSource !== "sold") {
        issues.push({
          section: "pricing",
          id: unit.itemCode,
          kind: "sold-source-wrong",
          detail: `Expected priceSource sold, got ${priceSource}`,
        });
      }
      continue;
    }

    if (unit.status === InventoryUnitStatus.Available) {
      const expectedLive = computeLiveListPriceForProduct(unit.product, marketRates);
      if (Math.abs(price - expectedLive) > 0.01) {
        issues.push({
          section: "pricing",
          id: unit.itemCode,
          kind: "live-price-mismatch",
          detail: `Display ${price} != live ${expectedLive}`,
        });
      } else if (priceSource !== "live") {
        issues.push({
          section: "pricing",
          id: unit.itemCode,
          kind: "live-source-wrong",
          detail: `Expected priceSource live, got ${priceSource}`,
        });
      }
      continue;
    }

    if (unit.listPrice == null && unit.status !== InventoryUnitStatus.Sold) {
      issues.push({
        section: "pricing",
        id: unit.itemCode,
        kind: "missing-snapshot",
        detail: `Non-available unit (${unit.status}) has no listPrice snapshot`,
      });
    }
  }

  console.log(`Checked ${units.length} units — ${issues.filter((i) => i.section === "pricing").length} pricing issue(s)`);

  section("Catalog price vs live valuation");
  const productsWithStock = await prisma.product.findMany({
    where: { stock: { gt: 0 } },
    select: {
      sku: true,
      stock: true,
      price: true,
      metal: true,
      purity: true,
      weightGrams: true,
    },
  });

  let catalogDriftCount = 0;
  for (const product of productsWithStock) {
    const dbPrice = moneyToNumber(product.price);
    const livePrice = computeLiveListPriceForProduct(product, marketRates);
    if (Math.abs(dbPrice - livePrice) <= 1) continue;

    catalogDriftCount += 1;
    const oldValuation = dbPrice * product.stock;
    const liveValuation = livePrice * product.stock;
    issues.push({
      section: "catalog-price",
      id: product.sku,
      kind: "db-vs-live",
      detail: `DB price ₹${dbPrice.toLocaleString("en-IN")} vs live ₹${livePrice.toLocaleString("en-IN")} (stock ${product.stock}; old val ₹${oldValuation.toLocaleString("en-IN")} → live ₹${liveValuation.toLocaleString("en-IN")})`,
    });
  }

  console.log(
    `${catalogDriftCount} product(s) with stored price differing from live market price`,
  );

  section("Stock valuation (live, available units)");
  const orgIds = [...new Set((await prisma.organization.findMany({ select: { id: true } })).map((o) => o.id))];
  let totalLiveValue = 0;
  let totalLiveUnits = 0;
  for (const organizationId of orgIds) {
    const { units: valuationUnits, marketRates: orgRates } =
      await fetchAvailableUnitsForValuation(organizationId);
    for (const unit of valuationUnits) {
      totalLiveUnits += 1;
      totalLiveValue += resolveAvailableUnitValue(unit, orgRates);
    }
  }
  console.log(`Available units: ${totalLiveUnits}`);
  console.log(`Total live inventory value: ₹${Math.round(totalLiveValue).toLocaleString("en-IN")}`);

  section("Audit summary");
  const bySection = new Map<string, number>();
  for (const issue of issues) {
    bySection.set(issue.section, (bySection.get(issue.section) ?? 0) + 1);
  }

  if (issues.length === 0) {
    console.log("All checks passed.");
  } else {
    console.log(`Total issues: ${issues.length}`);
    for (const [name, count] of bySection) {
      console.log(`- ${name}: ${count}`);
    }
    console.log("");
    console.log("Top issues:");
    for (const issue of issues.slice(0, 30)) {
      console.log(`- [${issue.section}/${issue.kind}] ${issue.id}: ${issue.detail}`);
    }
    if (issues.length > 30) {
      console.log(`… and ${issues.length - 30} more`);
    }
  }

  console.log("");
  console.log(`Completed in ${((Date.now() - started) / 1000).toFixed(1)}s`);
  if (issues.length > 0) process.exitCode = 1;
};

main()
  .catch((error) => {
    console.error("ERP audit failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
