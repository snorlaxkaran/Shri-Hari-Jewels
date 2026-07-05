-- StoneStock replaces StoneMaster + StoneLot

CREATE TYPE "StoneStockStatus" AS ENUM ('Active', 'Depleted', 'Closed');
CREATE TYPE "StoneRateBasis" AS ENUM ('Pcs', 'Carat');

CREATE TABLE "StoneStock" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "stoneType" TEXT NOT NULL,
    "lotNo" TEXT NOT NULL,
    "pieces" INTEGER,
    "weightCt" DECIMAL(10,4),
    "ratePerUnit" DECIMAL(10,4) NOT NULL,
    "rateBasis" "StoneRateBasis" NOT NULL,
    "supplierName" TEXT NOT NULL,
    "totalValue" DECIMAL(14,2) NOT NULL,
    "currentPieces" INTEGER NOT NULL DEFAULT 0,
    "currentWeightCt" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "purchaseDate" TIMESTAMP(3) NOT NULL,
    "status" "StoneStockStatus" NOT NULL DEFAULT 'Active',
    "notes" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoneStock_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoneStock_branchId_lotNo_key" ON "StoneStock"("branchId", "lotNo");
CREATE INDEX "StoneStock_organizationId_idx" ON "StoneStock"("organizationId");
CREATE INDEX "StoneStock_branchId_idx" ON "StoneStock"("branchId");
CREATE INDEX "StoneStock_stoneType_idx" ON "StoneStock"("stoneType");
CREATE INDEX "StoneStock_status_idx" ON "StoneStock"("status");

ALTER TABLE "StoneStock" ADD CONSTRAINT "StoneStock_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "StoneStockMovement" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "stoneStockId" TEXT NOT NULL,
    "movementType" "StoneMovementType" NOT NULL,
    "qty" INTEGER NOT NULL,
    "weightCt" DECIMAL(10,4) NOT NULL,
    "balanceQtyAfter" INTEGER NOT NULL,
    "balanceWeightAfter" DECIMAL(10,4) NOT NULL,
    "productionRunId" TEXT,
    "productionRunStoneIssueId" TEXT,
    "karigarName" TEXT,
    "ratePerUnit" DECIMAL(10,4) NOT NULL,
    "totalValue" DECIMAL(12,2) NOT NULL,
    "reason" TEXT,
    "notes" TEXT,
    "performedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StoneStockMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoneStockMovement_stoneStockId_idx" ON "StoneStockMovement"("stoneStockId");
CREATE INDEX "StoneStockMovement_branchId_idx" ON "StoneStockMovement"("branchId");
CREATE INDEX "StoneStockMovement_movementType_idx" ON "StoneStockMovement"("movementType");
CREATE INDEX "StoneStockMovement_createdAt_idx" ON "StoneStockMovement"("createdAt");

ALTER TABLE "StoneStockMovement" ADD CONSTRAINT "StoneStockMovement_stoneStockId_fkey"
  FOREIGN KEY ("stoneStockId") REFERENCES "StoneStock"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoneStockMovement" ADD CONSTRAINT "StoneStockMovement_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoneStockMovement" ADD CONSTRAINT "StoneStockMovement_productionRunStoneIssueId_fkey"
  FOREIGN KEY ("productionRunStoneIssueId") REFERENCES "ProductionRunStoneIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- MotifStone: stoneMasterId -> stoneType
ALTER TABLE "MotifStone" ADD COLUMN IF NOT EXISTS "stoneType" TEXT;
-- backfill handled by migrate-to-stone-stock.ts
ALTER TABLE "MotifStone" DROP CONSTRAINT IF EXISTS "MotifStone_stoneMasterId_fkey";
ALTER TABLE "MotifStone" DROP COLUMN IF EXISTS "stoneMasterId";
CREATE INDEX IF NOT EXISTS "MotifStone_stoneType_idx" ON "MotifStone"("stoneType");

-- ProductionRunStoneIssue: stoneLotId -> stoneStockId, drop stoneMasterId
ALTER TABLE "ProductionRunStoneIssue" RENAME COLUMN "stoneLotId" TO "stoneStockId";
ALTER TABLE "ProductionRunStoneIssue" DROP CONSTRAINT IF EXISTS "ProductionRunStoneIssue_stoneLotId_fkey";
ALTER TABLE "ProductionRunStoneIssue" DROP CONSTRAINT IF EXISTS "ProductionRunStoneIssue_stoneMasterId_fkey";
ALTER TABLE "ProductionRunStoneIssue" DROP COLUMN IF EXISTS "stoneMasterId";
ALTER TABLE "ProductionRunStoneIssue" ADD CONSTRAINT "ProductionRunStoneIssue_stoneStockId_fkey"
  FOREIGN KEY ("stoneStockId") REFERENCES "StoneStock"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Drop old tables
DROP TABLE IF EXISTS "StoneMovement";
DROP TABLE IF EXISTS "StoneLot";
DROP TABLE IF EXISTS "StoneMaster";

DROP TYPE IF EXISTS "StonePurchaseLotStatus";
DROP TYPE IF EXISTS "StoneCategory";
DROP TYPE IF EXISTS "StoneOriginType";
DROP TYPE IF EXISTS "StoneUOM";
DROP TYPE IF EXISTS "StoneShape";
