/**
 * Create missing Sale rows for Sold units from Wholesale GST Invoice transfers.
 * Inventory "Sold" status alone does not count toward Dashboard revenue — Sale rows do.
 *
 * Run:  npm run db:backfill-missing-wholesale-sales
 * Dry:  npm run db:backfill-missing-wholesale-sales -- --dry-run
 */
import "dotenv/config";
import { backfillMissingWholesaleSales } from "../src/lib/sales/backfill-wholesale.js";
import { prisma } from "../src/lib/db.js";

const dryRun = process.argv.includes("--dry-run");

const main = async () => {
  const report = await backfillMissingWholesaleSales({ dryRun });

  const mode = dryRun ? " (dry run)" : "";
  console.log(`Done${mode}:`);
  console.log(`  sales created: ${report.salesCreated}`);
  console.log(`  skipped:       ${report.skipped}`);
  console.log(`  failed:        ${report.failed}`);
  if (report.itemCodes.length > 0) {
    console.log(`  items:         ${report.itemCodes.join(", ")}`);
  }
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
