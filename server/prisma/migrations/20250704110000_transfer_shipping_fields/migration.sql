ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "contactPersonName"  TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "contactPersonPhone" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "courierCompany"     TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "dispatchDate"       TIMESTAMP(3);
ALTER TABLE "StockTransferItem" ADD COLUMN IF NOT EXISTS "weightGrams"    DECIMAL(10,3);
