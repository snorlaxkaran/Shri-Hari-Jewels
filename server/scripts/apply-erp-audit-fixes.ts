/**
 * Applies ERP audit fixes: inventory repair, sale invoices, catalog prices.
 * Run: npm run db:apply-audit-fixes
 */
import "dotenv/config";
import { backfillMissingSaleInvoices } from "../src/lib/invoices/backfill-sale-invoices.js";
import { repairInventory } from "../src/lib/inventory/service.js";
import { syncProductCatalogPricesToLive } from "../src/lib/inventory/sync-catalog-prices.js";
import { prisma } from "../src/lib/db.js";
import { runIntegrityReport } from "../src/lib/integrity/report.js";

const dryRun = process.argv.includes("--dry-run");

const main = async () => {
  console.log(dryRun ? "DRY RUN — no writes\n" : "Applying ERP audit fixes…\n");

  if (dryRun) {
    const repairPreview = await prisma.inventoryUnit.count({
      where: {
        sale: { paymentStatus: "Completed" },
        status: { not: "Sold" },
      },
    });
    const stockPreview = await prisma.product.count({
      where: { stock: { gt: 0 } },
    });
    const invoicePreview = await backfillMissingSaleInvoices({ dryRun: true });
    console.log("Inventory units needing Sold status:", repairPreview);
    console.log("Products with stock > 0:", stockPreview);
    console.log(
      `Invoice groups to create: ${invoicePreview.invoiceGroupsCreated} (${invoicePreview.salesLinked} sales)`,
    );
    console.log(
      `Wholesale sales skipped (use transfer invoice): ${invoicePreview.skippedWholesale}`,
    );
    return;
  }

  console.log("=== 1. Inventory repair ===");
  const repairReport = await repairInventory({ name: "ERP Audit Fix" });
  console.log(JSON.stringify(repairReport, null, 2));

  console.log("\n=== 2. Backfill missing retail invoices ===");
  const invoiceReport = await backfillMissingSaleInvoices();
  console.log(JSON.stringify(invoiceReport, null, 2));
  if (invoiceReport.errors.length > 0) {
    for (const error of invoiceReport.errors) {
      console.error(`  - ${error}`);
    }
  }

  console.log("\n=== 3. Sync catalog prices to live market rates ===");
  const priceReport = await syncProductCatalogPricesToLive();
  console.log(`Updated: ${priceReport.updated}, unchanged: ${priceReport.unchanged}`);
  for (const change of priceReport.changes) {
    console.log(
      `  - ${change.sku}: ₹${change.from.toLocaleString("en-IN")} → ₹${Math.round(change.to).toLocaleString("en-IN")}`,
    );
  }

  console.log("\n=== 4. Post-fix integrity check ===");
  const mismatches = await runIntegrityReport({ log: true });
  console.log(`Remaining integrity mismatches: ${mismatches.length}`);
  for (const mismatch of mismatches.slice(0, 20)) {
    console.log(
      `  - [${mismatch.category}] ${mismatch.message}` +
        (mismatch.expected
          ? ` (expected ${mismatch.expected}, actual ${mismatch.actual})`
          : ""),
    );
  }
};

main()
  .catch((error) => {
    console.error("Apply audit fixes failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
