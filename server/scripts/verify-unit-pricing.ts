/**
 * Verifies per-piece inventory pricing and deletion guards.
 * Run: npx tsx scripts/verify-unit-pricing.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { getCurrentMarketRates } from "../src/lib/market-rates/service.js";
import {
  computeLiveListPriceForProduct,
  resolveUnitDisplayPrice,
} from "../src/lib/inventory/unit-pricing.js";
import { moneyToNumber } from "../src/lib/money.js";

const prisma = new PrismaClient();

type Issue = {
  itemCode: string;
  kind: string;
  detail: string;
};

const main = async () => {
  const issues: Issue[] = [];
  const marketRates = await getCurrentMarketRates();

  const units = await prisma.inventoryUnit.findMany({
    include: { product: true, sale: true },
    orderBy: { itemCode: "asc" },
  });

  console.log(`Checking ${units.length} inventory units…`);

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
          itemCode: unit.itemCode,
          kind: "sold-price-mismatch",
          detail: `Display ${price} != sale.listPrice ${saleListPrice}`,
        });
      }
      if (priceSource !== "sold") {
        issues.push({
          itemCode: unit.itemCode,
          kind: "sold-source-wrong",
          detail: `Expected priceSource sold, got ${priceSource}`,
        });
      }
      if (unit.listPrice != null) {
        const locked = moneyToNumber(String(unit.listPrice));
        if (Math.abs(locked - saleListPrice) > 0.01) {
          issues.push({
            itemCode: unit.itemCode,
            kind: "sold-lock-mismatch",
            detail: `unit.listPrice ${locked} != sale.listPrice ${saleListPrice}`,
          });
        }
      }
      continue;
    }

    if (unit.status === "Available") {
      const expectedLive = computeLiveListPriceForProduct(
        unit.product,
        marketRates,
      );
      if (Math.abs(price - expectedLive) > 0.01) {
        issues.push({
          itemCode: unit.itemCode,
          kind: "live-price-mismatch",
          detail: `Display ${price} != live ${expectedLive}`,
        });
      }
      if (priceSource !== "live") {
        issues.push({
          itemCode: unit.itemCode,
          kind: "live-source-wrong",
          detail: `Expected priceSource live, got ${priceSource}`,
        });
      }
      continue;
    }

    if (unit.listPrice == null) {
      issues.push({
        itemCode: unit.itemCode,
        kind: "missing-snapshot",
        detail: `Non-available unit (${unit.status}) has no listPrice snapshot`,
      });
    }
  }

  const productsWithUnits = await prisma.product.count({
    where: { units: { some: {} } },
  });

  console.log("");
  console.log("Summary");
  console.log("-------");
  console.log(`Units checked: ${units.length}`);
  console.log(`Available: ${units.filter((u) => u.status === "Available").length}`);
  console.log(`Sold: ${units.filter((u) => u.status === "Sold").length}`);
  console.log(`Reserved: ${units.filter((u) => u.status === "Reserved").length}`);
  console.log(`Products with units (undeletable): ${productsWithUnits}`);
  console.log(`Gold 22K rate: ${marketRates.gold22k ?? "not set"}`);
  console.log(`Silver 925 rate: ${marketRates.silver925 ?? "not set"}`);

  if (issues.length === 0) {
    console.log("\nAll unit prices verified OK.");
    return;
  }

  console.log(`\nFound ${issues.length} issue(s):`);
  for (const issue of issues) {
    console.log(`- ${issue.itemCode} [${issue.kind}]: ${issue.detail}`);
  }
  process.exitCode = 1;
};

main()
  .catch((error) => {
    console.error("Verification failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
