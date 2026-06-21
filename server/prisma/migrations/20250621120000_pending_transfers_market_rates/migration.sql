-- CreateEnum
CREATE TYPE "StockTransferStatus" AS ENUM ('Pending', 'Accepted', 'Rejected', 'PartiallyAccepted');

-- AlterEnum (idempotent)
DO $$
BEGIN
  ALTER TYPE "InventoryUnitStatus" ADD VALUE 'InTransit';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN "goldMakingChargesPct" DECIMAL(5,2) NOT NULL DEFAULT 17.00;
ALTER TABLE "ShopSettings" ADD COLUMN "silverMakingChargesPct" DECIMAL(5,2) NOT NULL DEFAULT 17.00;
ALTER TABLE "ShopSettings" ADD COLUMN "makingChargesOverrideNote" TEXT;

-- AlterTable
ALTER TABLE "StockTransfer" ADD COLUMN "status" "StockTransferStatus" NOT NULL DEFAULT 'Pending';
ALTER TABLE "StockTransfer" ADD COLUMN "acceptedById" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "acceptedByName" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "acceptedAt" TIMESTAMP(3);
ALTER TABLE "StockTransfer" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "notes" TEXT;

-- AlterTable
ALTER TABLE "StockTransferItem" ADD COLUMN "accepted" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "MetalMarketRate" (
    "id" TEXT NOT NULL,
    "metalType" TEXT NOT NULL,
    "purity" TEXT NOT NULL,
    "ratePerGram" DECIMAL(12,2) NOT NULL,
    "source" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MetalMarketRate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockTransfer_status_idx" ON "StockTransfer"("status");
CREATE INDEX "StockTransfer_toBranchId_status_idx" ON "StockTransfer"("toBranchId", "status");
CREATE INDEX "MetalMarketRate_metalType_purity_fetchedAt_idx" ON "MetalMarketRate"("metalType", "purity", "fetchedAt");

-- Backfill: existing transfers were immediately completed under the old flow
UPDATE "StockTransfer" SET "status" = 'Accepted', "acceptedAt" = "createdAt" WHERE "status" = 'Pending';
