-- CreateEnum
CREATE TYPE "MakingChargeType" AS ENUM ('Flat', 'PercentOfMetal');

-- InventoryUnit: wastage, making charge type, certified stone link
ALTER TABLE "InventoryUnit" ADD COLUMN "wastagePercent" DECIMAL(5,2);
ALTER TABLE "InventoryUnit" ADD COLUMN "makingChargeType" "MakingChargeType" NOT NULL DEFAULT 'Flat';
ALTER TABLE "InventoryUnit" ADD COLUMN "makingChargesPct" DECIMAL(5,2);
ALTER TABLE "InventoryUnit" ADD COLUMN "certifiedStoneLotId" TEXT;

CREATE INDEX "InventoryUnit_certifiedStoneLotId_idx" ON "InventoryUnit"("certifiedStoneLotId");

ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_certifiedStoneLotId_fkey"
  FOREIGN KEY ("certifiedStoneLotId") REFERENCES "CertifiedStoneLot"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- EntryVoucher: purchase date
ALTER TABLE "EntryVoucher" ADD COLUMN "purchaseDate" TIMESTAMP(3);
