-- Product metadata for stock entry
ALTER TABLE "Product" ADD COLUMN "subCategory" TEXT;
ALTER TABLE "Product" ADD COLUMN "categorySize" TEXT;
ALTER TABLE "Product" ADD COLUMN "stoneInfo" TEXT;
ALTER TABLE "Product" ADD COLUMN "hsnCode" TEXT;

-- Unit-level cost price
ALTER TABLE "InventoryUnit" ADD COLUMN "costPrice" DECIMAL(12,2);

-- Vendor on entry voucher (batch-level)
ALTER TABLE "EntryVoucher" ADD COLUMN "vendorId" TEXT;
CREATE INDEX "EntryVoucher_vendorId_idx" ON "EntryVoucher"("vendorId");
ALTER TABLE "EntryVoucher" ADD CONSTRAINT "EntryVoucher_vendorId_fkey"
  FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Stone types per inventory unit
CREATE TABLE "InventoryUnitStoneType" (
    "id" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "stoneTypeId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "InventoryUnitStoneType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "InventoryUnitStoneType_unitId_stoneTypeId_key"
  ON "InventoryUnitStoneType"("unitId", "stoneTypeId");
CREATE INDEX "InventoryUnitStoneType_unitId_idx" ON "InventoryUnitStoneType"("unitId");
CREATE INDEX "InventoryUnitStoneType_stoneTypeId_idx" ON "InventoryUnitStoneType"("stoneTypeId");

ALTER TABLE "InventoryUnitStoneType" ADD CONSTRAINT "InventoryUnitStoneType_unitId_fkey"
  FOREIGN KEY ("unitId") REFERENCES "InventoryUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryUnitStoneType" ADD CONSTRAINT "InventoryUnitStoneType_stoneTypeId_fkey"
  FOREIGN KEY ("stoneTypeId") REFERENCES "StoneType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
