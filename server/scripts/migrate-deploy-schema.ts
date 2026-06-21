/**
 * Idempotent schema updates applied before `prisma db push` on Render.
 * Handles new feature tables/columns and legacy Product.status TEXT → enum.
 *
 * Run: npx tsx scripts/migrate-deploy-schema.ts
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const run = async (label: string, sql: string) => {
  console.log(label);
  await prisma.$executeRawUnsafe(sql);
};

const ensureProductStockStatusEnum = async () => {
  await run(
    "Ensure Product.status uses ProductStockStatus enum…",
    `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ProductStockStatus') THEN
        CREATE TYPE "ProductStockStatus" AS ENUM ('In Stock', 'Low Stock', 'Out of Stock');
      END IF;

      IF EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'Product'
          AND column_name = 'status'
          AND udt_name IN ('text', 'varchar', 'character varying')
      ) THEN
        ALTER TABLE "Product"
          ALTER COLUMN "status" TYPE "ProductStockStatus"
          USING (
            CASE TRIM("status"::text)
              WHEN 'InStock' THEN 'In Stock'::"ProductStockStatus"
              WHEN 'LowStock' THEN 'Low Stock'::"ProductStockStatus"
              WHEN 'OutOfStock' THEN 'Out of Stock'::"ProductStockStatus"
              ELSE TRIM("status"::text)::"ProductStockStatus"
            END
          );
      END IF;
    END $$;
    `,
  );
};

const ensureInventoryUnitInTransit = async () => {
  await run(
    "Ensure InventoryUnitStatus includes InTransit…",
    `
    DO $$
    BEGIN
      ALTER TYPE "InventoryUnitStatus" ADD VALUE 'InTransit';
    EXCEPTION
      WHEN duplicate_object THEN NULL;
    END $$;
    `,
  );
};

const ensureStockTransferStatus = async () => {
  await run(
    "Ensure StockTransferStatus enum and columns…",
    `
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'StockTransferStatus') THEN
        CREATE TYPE "StockTransferStatus" AS ENUM ('Pending', 'Accepted', 'Rejected', 'PartiallyAccepted');
      END IF;
    END $$;

    ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "goldMakingChargesPct" DECIMAL(5,2) NOT NULL DEFAULT 17.00;
    ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "silverMakingChargesPct" DECIMAL(5,2) NOT NULL DEFAULT 17.00;
    ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "makingChargesOverrideNote" TEXT;

    ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "status" "StockTransferStatus" NOT NULL DEFAULT 'Pending';
    ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "acceptedById" TEXT;
    ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "acceptedByName" TEXT;
    ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "acceptedAt" TIMESTAMP(3);
    ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "rejectionReason" TEXT;
    ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "notes" TEXT;

    ALTER TABLE "StockTransferItem" ADD COLUMN IF NOT EXISTS "accepted" BOOLEAN NOT NULL DEFAULT true;

    CREATE TABLE IF NOT EXISTS "MetalMarketRate" (
      "id" TEXT NOT NULL,
      "metalType" TEXT NOT NULL,
      "purity" TEXT NOT NULL,
      "ratePerGram" DECIMAL(12,2) NOT NULL,
      "source" TEXT NOT NULL,
      "fetchedAt" TIMESTAMP(3) NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "MetalMarketRate_pkey" PRIMARY KEY ("id")
    );

    CREATE INDEX IF NOT EXISTS "StockTransfer_status_idx" ON "StockTransfer"("status");
    CREATE INDEX IF NOT EXISTS "StockTransfer_toBranchId_status_idx" ON "StockTransfer"("toBranchId", "status");
    CREATE INDEX IF NOT EXISTS "MetalMarketRate_metalType_purity_fetchedAt_idx" ON "MetalMarketRate"("metalType", "purity", "fetchedAt");
    `,
  );

  await run(
    "Backfill accepted stock transfers…",
    `
    UPDATE "StockTransfer"
    SET "status" = 'Accepted', "acceptedAt" = COALESCE("acceptedAt", "createdAt")
    WHERE "status" = 'Pending' AND "acceptedAt" IS NULL;
    `,
  );
};

const main = async () => {
  await ensureProductStockStatusEnum();
  await ensureInventoryUnitInTransit();
  await ensureStockTransferStatus();
  console.log("Deploy schema migration complete.");
};

main()
  .catch((error) => {
    console.error("Deploy schema migration failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
