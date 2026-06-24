-- Stone Master & Stone Inventory rewrite
-- Renames legacy certified stone lots and adds purchase-receipt stone inventory

-- Rename legacy enum
ALTER TYPE "StoneLotStatus" RENAME TO "CertifiedStoneLotStatus";

-- Rename legacy StoneLot table to CertifiedStoneLot
ALTER TABLE "StoneLot" RENAME TO "CertifiedStoneLot";

-- Drop global unique on certificate number; scope per branch
ALTER TABLE "CertifiedStoneLot" DROP CONSTRAINT IF EXISTS "StoneLot_certificateNumber_key";
CREATE UNIQUE INDEX "CertifiedStoneLot_branchId_certificateNumber_key"
  ON "CertifiedStoneLot"("branchId", "certificateNumber");

-- New enums
CREATE TYPE "StoneCategory" AS ENUM ('CZ', 'Diamond', 'Precious', 'SemiPrecious');
CREATE TYPE "StoneOriginType" AS ENUM ('Natural', 'LabGrown', 'Synthetic');
CREATE TYPE "StoneUOM" AS ENUM ('Pcs', 'Carat');
CREATE TYPE "StoneShape" AS ENUM (
  'Round', 'Oval', 'Pear', 'Princess', 'Cushion', 'Emerald', 'Marquise',
  'Heart', 'Baguette', 'Trillion', 'Asscher', 'Radiant', 'Hexagon', 'Octagon', 'Cabochon'
);
CREATE TYPE "StonePurchaseLotStatus" AS ENUM ('Active', 'Depleted', 'Closed');
CREATE TYPE "StoneMovementType" AS ENUM ('Receipt', 'Issue', 'Return', 'Breakage', 'Loss', 'Adjustment');
CREATE TYPE "StoneIssueStatus" AS ENUM ('Open', 'Settled');

-- Stone Master (org-scoped catalog)
CREATE TABLE "StoneMaster" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "stoneCode" TEXT NOT NULL,
  "stoneName" TEXT NOT NULL,
  "stoneCategory" "StoneCategory" NOT NULL,
  "stoneType" "StoneOriginType" NOT NULL,
  "stoneMaterial" TEXT NOT NULL,
  "shape" "StoneShape" NOT NULL,
  "sizeMm" TEXT NOT NULL,
  "color" TEXT NOT NULL,
  "clarityGrade" TEXT,
  "cut" TEXT,
  "uom" "StoneUOM" NOT NULL,
  "unitWeightCt" DECIMAL(10,6),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "notes" TEXT,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StoneMaster_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoneMaster_organizationId_stoneCode_key"
  ON "StoneMaster"("organizationId", "stoneCode");
CREATE INDEX "StoneMaster_organizationId_idx" ON "StoneMaster"("organizationId");
CREATE INDEX "StoneMaster_stoneCategory_idx" ON "StoneMaster"("stoneCategory");
CREATE INDEX "StoneMaster_isActive_idx" ON "StoneMaster"("isActive");

ALTER TABLE "StoneMaster"
  ADD CONSTRAINT "StoneMaster_organizationId_fkey"
  FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Stone Lot (purchase receipt, branch-scoped)
CREATE TABLE "StoneLot" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "stoneMasterId" TEXT NOT NULL,
  "lotNo" TEXT NOT NULL,
  "packetNo" TEXT,
  "vendorStoneCode" TEXT,
  "vendorName" TEXT NOT NULL,
  "invoiceNo" TEXT NOT NULL,
  "invoiceDate" TIMESTAMP(3) NOT NULL,
  "qtyPurchased" INTEGER NOT NULL,
  "weightPurchased" DECIMAL(10,4) NOT NULL,
  "purchaseRate" DECIMAL(10,4) NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "gstPct" DECIMAL(5,2) NOT NULL,
  "gstAmount" DECIMAL(12,2) NOT NULL,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "currentQty" INTEGER NOT NULL,
  "currentWeightCt" DECIMAL(10,4) NOT NULL,
  "location" TEXT,
  "reorderLevel" INTEGER,
  "status" "StonePurchaseLotStatus" NOT NULL DEFAULT 'Active',
  "notes" TEXT,
  "createdByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "StoneLot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StoneLot_branchId_lotNo_key" ON "StoneLot"("branchId", "lotNo");
CREATE INDEX "StoneLot_branchId_idx" ON "StoneLot"("branchId");
CREATE INDEX "StoneLot_stoneMasterId_idx" ON "StoneLot"("stoneMasterId");
CREATE INDEX "StoneLot_status_idx" ON "StoneLot"("status");

ALTER TABLE "StoneLot"
  ADD CONSTRAINT "StoneLot_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoneLot"
  ADD CONSTRAINT "StoneLot_stoneMasterId_fkey"
  FOREIGN KEY ("stoneMasterId") REFERENCES "StoneMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Production run stone issues
CREATE TABLE "ProductionRunStoneIssue" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "productionRunId" TEXT NOT NULL,
  "stoneLotId" TEXT NOT NULL,
  "stoneMasterId" TEXT NOT NULL,
  "qtyIssued" INTEGER NOT NULL,
  "weightIssuedCt" DECIMAL(10,4) NOT NULL,
  "karigarName" TEXT NOT NULL,
  "qtyReturned" INTEGER NOT NULL DEFAULT 0,
  "weightReturnedCt" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "weightBrokenCt" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "qtyBroken" INTEGER NOT NULL DEFAULT 0,
  "weightLostCt" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "qtyLost" INTEGER NOT NULL DEFAULT 0,
  "weightUsedCt" DECIMAL(10,4) NOT NULL DEFAULT 0,
  "qtyUsed" INTEGER NOT NULL DEFAULT 0,
  "lossReason" TEXT,
  "status" "StoneIssueStatus" NOT NULL DEFAULT 'Open',
  "issuedByName" TEXT NOT NULL,
  "settledByName" TEXT,
  "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "settledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductionRunStoneIssue_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductionRunStoneIssue_branchId_idx" ON "ProductionRunStoneIssue"("branchId");
CREATE INDEX "ProductionRunStoneIssue_productionRunId_idx" ON "ProductionRunStoneIssue"("productionRunId");
CREATE INDEX "ProductionRunStoneIssue_stoneLotId_idx" ON "ProductionRunStoneIssue"("stoneLotId");
CREATE INDEX "ProductionRunStoneIssue_status_idx" ON "ProductionRunStoneIssue"("status");

ALTER TABLE "ProductionRunStoneIssue"
  ADD CONSTRAINT "ProductionRunStoneIssue_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRunStoneIssue"
  ADD CONSTRAINT "ProductionRunStoneIssue_productionRunId_fkey"
  FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRunStoneIssue"
  ADD CONSTRAINT "ProductionRunStoneIssue_stoneLotId_fkey"
  FOREIGN KEY ("stoneLotId") REFERENCES "StoneLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ProductionRunStoneIssue"
  ADD CONSTRAINT "ProductionRunStoneIssue_stoneMasterId_fkey"
  FOREIGN KEY ("stoneMasterId") REFERENCES "StoneMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Stone movement ledger
CREATE TABLE "StoneMovement" (
  "id" TEXT NOT NULL,
  "branchId" TEXT NOT NULL,
  "stoneLotId" TEXT NOT NULL,
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

  CONSTRAINT "StoneMovement_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StoneMovement_stoneLotId_idx" ON "StoneMovement"("stoneLotId");
CREATE INDEX "StoneMovement_branchId_idx" ON "StoneMovement"("branchId");
CREATE INDEX "StoneMovement_movementType_idx" ON "StoneMovement"("movementType");
CREATE INDEX "StoneMovement_createdAt_idx" ON "StoneMovement"("createdAt");

ALTER TABLE "StoneMovement"
  ADD CONSTRAINT "StoneMovement_stoneLotId_fkey"
  FOREIGN KEY ("stoneLotId") REFERENCES "StoneLot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoneMovement"
  ADD CONSTRAINT "StoneMovement_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoneMovement"
  ADD CONSTRAINT "StoneMovement_productionRunStoneIssueId_fkey"
  FOREIGN KEY ("productionRunStoneIssueId") REFERENCES "ProductionRunStoneIssue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Migrate MotifStone: bulkStoneLotId -> stoneMasterId
-- Create StoneMaster entries from existing BulkStoneLot rows (one per lot, org via branch)
INSERT INTO "StoneMaster" (
  "id", "organizationId", "stoneCode", "stoneName", "stoneCategory", "stoneType",
  "stoneMaterial", "shape", "sizeMm", "color", "uom", "isActive", "createdByName", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  b."organizationId",
  'BS-' || substr(bsl."id", 1, 8),
  bsl."stoneType" || ' ' || bsl."sizeLabel",
  'CZ'::"StoneCategory",
  'Synthetic'::"StoneOriginType",
  bsl."stoneType",
  'Round'::"StoneShape",
  bsl."sizeLabel",
  'Mixed',
  'Pcs'::"StoneUOM",
  true,
  'Migration',
  NOW()
FROM "BulkStoneLot" bsl
JOIN "Branch" b ON b."id" = bsl."branchId";

-- Add stoneMasterId column to MotifStone
ALTER TABLE "MotifStone" ADD COLUMN "stoneMasterId" TEXT;

UPDATE "MotifStone" ms
SET "stoneMasterId" = sm."id"
FROM "BulkStoneLot" bsl
JOIN "Branch" br ON br."id" = bsl."branchId"
JOIN "StoneMaster" sm ON sm."organizationId" = br."organizationId"
  AND sm."stoneCode" = 'BS-' || substr(bsl."id", 1, 8)
WHERE ms."bulkStoneLotId" = bsl."id";

ALTER TABLE "MotifStone" ALTER COLUMN "stoneMasterId" SET NOT NULL;

ALTER TABLE "MotifStone" DROP CONSTRAINT IF EXISTS "MotifStone_bulkStoneLotId_fkey";
DROP INDEX IF EXISTS "MotifStone_bulkStoneLotId_idx";
ALTER TABLE "MotifStone" DROP COLUMN "bulkStoneLotId";

ALTER TABLE "MotifStone"
  ADD CONSTRAINT "MotifStone_stoneMasterId_fkey"
  FOREIGN KEY ("stoneMasterId") REFERENCES "StoneMaster"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "MotifStone_stoneMasterId_idx" ON "MotifStone"("stoneMasterId");

-- Migrate BulkStoneLot data into StoneLot purchase receipts
INSERT INTO "StoneLot" (
  "id", "branchId", "stoneMasterId", "lotNo", "vendorName", "invoiceNo", "invoiceDate",
  "qtyPurchased", "weightPurchased", "purchaseRate", "amount", "gstPct", "gstAmount", "totalAmount",
  "currentQty", "currentWeightCt", "location", "status", "createdByName", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  bsl."branchId",
  sm."id",
  COALESCE(bsl."lotReference", 'LOT-MIG-' || substr(bsl."id", 1, 8)),
  COALESCE(bsl."vendor", 'Unknown'),
  'MIGRATED',
  COALESCE(bsl."purchaseDate", bsl."createdAt"),
  bsl."quantity",
  0,
  bsl."pricePerStone",
  bsl."pricePerStone" * bsl."quantity",
  0,
  0,
  bsl."pricePerStone" * bsl."quantity",
  bsl."quantity",
  0,
  bsl."location",
  CASE WHEN bsl."quantity" > 0 THEN 'Active'::"StonePurchaseLotStatus" ELSE 'Depleted'::"StonePurchaseLotStatus" END,
  'Migration',
  NOW()
FROM "BulkStoneLot" bsl
JOIN "Branch" br ON br."id" = bsl."branchId"
JOIN "StoneMaster" sm ON sm."organizationId" = br."organizationId"
  AND sm."stoneCode" = 'BS-' || substr(bsl."id", 1, 8);

-- Receipt movements for migrated lots
INSERT INTO "StoneMovement" (
  "id", "branchId", "stoneLotId", "movementType", "qty", "weightCt",
  "balanceQtyAfter", "balanceWeightAfter", "ratePerUnit", "totalValue",
  "reason", "performedByName", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  sl."branchId",
  sl."id",
  'Receipt'::"StoneMovementType",
  sl."qtyPurchased",
  sl."weightPurchased",
  sl."currentQty",
  sl."currentWeightCt",
  sl."purchaseRate",
  sl."amount",
  'Migrated from BulkStoneLot',
  'Migration',
  sl."createdAt"
FROM "StoneLot" sl
WHERE sl."invoiceNo" = 'MIGRATED';
