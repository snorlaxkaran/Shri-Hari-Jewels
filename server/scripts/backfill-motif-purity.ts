/**
 * Backfill Motif.purity before/after schema migration.
 * Run: npx tsx scripts/backfill-motif-purity.ts
 */
import "dotenv/config";
import { prisma } from "../src/lib/db.js";

const main = async () => {
  const columns = await prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Motif'
      AND column_name = 'purity'
  `;

  if (columns.length === 0) {
    console.log("Adding Motif.purity column…");
    await prisma.$executeRaw`ALTER TABLE "Motif" ADD COLUMN "purity" TEXT`;
  }

  const updated = await prisma.$executeRaw`
    UPDATE "Motif"
    SET "purity" = CASE
      WHEN "metal" = 'Silver' THEN '925'
      ELSE COALESCE(NULLIF("purity", ''), '22K')
    END
    WHERE "purity" IS NULL
       OR "purity" = ''
       OR ("metal" = 'Silver' AND "purity" <> '925')
  `;
  console.log("Backfilled motif purity rows:", updated);

  await prisma.$executeRaw`
    ALTER TABLE "Motif" ALTER COLUMN "purity" SET NOT NULL
  `;
  console.log("Motif.purity is NOT NULL.");

  const dupes = await prisma.$queryRaw<
    Array<{
      branchId: string;
      name: string;
      metal: string;
      purity: string;
      count: bigint;
    }>
  >`
    SELECT "branchId", "name", "metal", "purity", COUNT(*)::bigint AS count
    FROM "Motif"
    GROUP BY "branchId", "name", "metal", "purity"
    HAVING COUNT(*) > 1
  `;

  if (dupes.length > 0) {
    console.error(
      "Cannot add unique (branchId, name, metal, purity) — duplicates found:",
    );
    for (const row of dupes) {
      console.error(
        `  ${row.name} / ${row.metal} / ${row.purity} (${row.count} rows)`,
      );
    }
    process.exit(1);
  }

  const motifs = await prisma.$queryRaw<
    Array<{ name: string; metal: string; purity: string }>
  >`SELECT "name", "metal", "purity" FROM "Motif" ORDER BY "name"`;

  console.log("Current motifs:");
  for (const m of motifs) {
    console.log(`  ${m.name} — ${m.metal} ${m.purity}`);
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
