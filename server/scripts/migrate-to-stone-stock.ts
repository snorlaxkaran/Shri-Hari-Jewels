/**
 * One-off migration: StoneLot + StoneMaster → StoneStock
 *
 * Run BEFORE `npx prisma db push` if upgrading from the old schema:
 *   npx tsx scripts/migrate-to-stone-stock.ts
 *
 * Safe to re-run: skips when StoneLot table does not exist or StoneStock already has rows.
 */
import { Prisma } from "@prisma/client";
import { prisma } from "../src/lib/db.js";

const tableExists = async (table: string): Promise<boolean> => {
  const rows = await prisma.$queryRaw<{ exists: boolean }[]>`
    SELECT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ${table}
    ) AS "exists"
  `;
  return rows[0]?.exists ?? false;
};

const main = async () => {
  const hasStoneLot = await tableExists("StoneLot");
  const hasStoneStock = await tableExists("StoneStock");

  if (!hasStoneLot) {
    console.log("StoneLot table not found — nothing to migrate.");
    return;
  }

  if (hasStoneStock) {
    const count = await prisma.stoneStock.count();
    if (count > 0) {
      console.log(`StoneStock already has ${count} rows — skipping migration.`);
      return;
    }
  }

  console.log("Migrating StoneLot → StoneStock…");

  await prisma.$executeRawUnsafe(`
    INSERT INTO "StoneStock" (
      "id", "organizationId", "branchId", "stoneType", "lotNo",
      "pieces", "weightCt", "ratePerUnit", "rateBasis", "supplierName",
      "totalValue", "currentPieces", "currentWeightCt", "purchaseDate",
      "status", "notes", "createdByName", "createdAt", "updatedAt"
    )
    SELECT
      sl."id",
      b."organizationId",
      sl."branchId",
      COALESCE(NULLIF(sm."stoneMaterial", ''), sm."stoneName"),
      sl."lotNo",
      CASE WHEN sl."qtyPurchased" > 0 THEN sl."qtyPurchased" ELSE NULL END,
      CASE WHEN sl."weightPurchased" > 0 THEN sl."weightPurchased" ELSE NULL END,
      sl."purchaseRate",
      CASE WHEN sm."uom" = 'Carat' THEN 'Carat'::"StoneRateBasis" ELSE 'Pcs'::"StoneRateBasis" END,
      sl."vendorName",
      sl."amount",
      sl."currentQty",
      sl."currentWeightCt",
      sl."invoiceDate",
      sl."status"::text::"StoneStockStatus",
      sl."notes",
      sl."createdByName",
      sl."createdAt",
      sl."updatedAt"
    FROM "StoneLot" sl
    JOIN "StoneMaster" sm ON sm."id" = sl."stoneMasterId"
    JOIN "Branch" b ON b."id" = sl."branchId"
    ON CONFLICT ("id") DO NOTHING
  `);

  if (await tableExists("StoneMovement")) {
    await prisma.$executeRawUnsafe(`
      INSERT INTO "StoneStockMovement" (
        "id", "branchId", "stoneStockId", "movementType", "qty", "weightCt",
        "balanceQtyAfter", "balanceWeightAfter", "productionRunId",
        "productionRunStoneIssueId", "karigarName", "ratePerUnit", "totalValue",
        "reason", "notes", "performedByName", "createdAt"
      )
      SELECT
        m."id", m."branchId", m."stoneLotId", m."movementType", m."qty", m."weightCt",
        m."balanceQtyAfter", m."balanceWeightAfter", m."productionRunId",
        m."productionRunStoneIssueId", m."karigarName", m."ratePerUnit", m."totalValue",
        m."reason", m."notes", m."performedByName", m."createdAt"
      FROM "StoneMovement" m
      ON CONFLICT ("id") DO NOTHING
    `);
  }

  if (await tableExists("MotifStone")) {
    const motifCols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'MotifStone'
    `;
    const hasStoneMasterId = motifCols.some((c) => c.column_name === "stoneMasterId");
    const hasStoneType = motifCols.some((c) => c.column_name === "stoneType");

    if (hasStoneMasterId && hasStoneType) {
      await prisma.$executeRawUnsafe(`
        UPDATE "MotifStone" ms
        SET "stoneType" = COALESCE(NULLIF(sm."stoneMaterial", ''), sm."stoneName")
        FROM "StoneMaster" sm
        WHERE sm."id" = ms."stoneMasterId"
          AND (ms."stoneType" IS NULL OR ms."stoneType" = '')
      `);
    }
  }

  if (await tableExists("ProductionRunStoneIssue")) {
    const issueCols = await prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'ProductionRunStoneIssue'
    `;
    if (issueCols.some((c) => c.column_name === "stoneLotId")) {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ProductionRunStoneIssue"
        RENAME COLUMN "stoneLotId" TO "stoneStockId"
      `).catch(() => undefined);
    }
  }

  const migrated = await prisma.stoneStock.count();
  console.log(`Migrated ${migrated} stone stock entries.`);
};

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
