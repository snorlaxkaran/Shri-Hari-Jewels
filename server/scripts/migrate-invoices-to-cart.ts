/**
 * Backfill consolidated cart-level invoices from legacy per-sale invoice rows.
 * Run on a DB copy before production deploy:
 *   npx tsx scripts/migrate-invoices-to-cart.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/db.js";

const columnExists = async (table: string, column: string): Promise<boolean> => {
  const rows = await prisma.$queryRaw<Array<{ exists: boolean }>>`
    SELECT EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND lower(table_name) = lower(${table})
        AND lower(column_name) = lower(${column})
    ) AS exists
  `;
  return rows[0]?.exists ?? false;
};

const main = async () => {
  const hasLegacySaleId = await columnExists("Invoice", "saleId");
  if (!hasLegacySaleId) {
    console.log("Legacy Invoice.saleId not found — migration not needed.");
    return;
  }
  console.log(
    "Legacy invoice columns detected. Run this script against a backup, then apply the new schema.",
  );
  console.log(
    "For fresh installs, use prisma db push with the updated schema — no backfill required.",
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
