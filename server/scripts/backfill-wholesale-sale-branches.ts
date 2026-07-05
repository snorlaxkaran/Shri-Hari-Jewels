/**
 * Re-attribute historical wholesale transfer sales to the branch of the user
 * who created the transfer (matches createStockTransfer / Option A behaviour).
 *
 * Run:  npm run db:backfill-wholesale-sale-branches
 * Dry:  npm run db:backfill-wholesale-sale-branches -- --dry-run
 */
import "dotenv/config";
import { prisma } from "../src/lib/db.js";
import { getUserBranch } from "../src/lib/branches/access.js";

const dryRun = process.argv.includes("--dry-run");

const main = async () => {
  const sales = await prisma.sale.findMany({
    where: {
      saleSource: "WholesaleTransfer",
      stockTransferId: { not: null },
    },
    select: {
      id: true,
      branchId: true,
      stockTransferId: true,
      itemCode: true,
      branch: { select: { organizationId: true } },
    },
  });

  if (sales.length === 0) {
    console.log("No wholesale transfer sales found.");
    return;
  }

  let updated = 0;
  let skipped = 0;
  let failed = 0;

  for (const sale of sales) {
    const transfer = await prisma.stockTransfer.findUnique({
      where: { id: sale.stockTransferId! },
      select: { createdById: true },
    });

    if (!transfer?.createdById) {
      console.warn(`  skip ${sale.itemCode}: transfer has no createdById`);
      skipped += 1;
      continue;
    }

    try {
      const sellingBranchId = await getUserBranch(
        transfer.createdById,
        sale.branch.organizationId,
      );

      if (sale.branchId === sellingBranchId) {
        skipped += 1;
        continue;
      }

      if (dryRun) {
        console.log(
          `  would update ${sale.itemCode}: ${sale.branchId} -> ${sellingBranchId}`,
        );
      } else {
        await prisma.sale.update({
          where: { id: sale.id },
          data: { branchId: sellingBranchId },
        });
      }
      updated += 1;
    } catch (error) {
      console.error(`  failed ${sale.itemCode}:`, error);
      failed += 1;
    }
  }

  const mode = dryRun ? " (dry run)" : "";
  console.log(
    `Done${mode}: ${updated} updated, ${skipped} unchanged/skipped, ${failed} failed (${sales.length} total).`,
  );
};

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
