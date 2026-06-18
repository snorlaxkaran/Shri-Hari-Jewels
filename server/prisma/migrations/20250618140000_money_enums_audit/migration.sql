-- Step 5: Currency fields to DECIMAL(12,2)
ALTER TABLE "Product" ALTER COLUMN "makingCharges" TYPE DECIMAL(12,2) USING "makingCharges"::decimal;
ALTER TABLE "Product" ALTER COLUMN "price" TYPE DECIMAL(12,2) USING "price"::decimal;

ALTER TABLE "StockTransfer" ALTER COLUMN "totalValue" TYPE DECIMAL(12,2) USING "totalValue"::decimal;
ALTER TABLE "StockTransferItem" ALTER COLUMN "price" TYPE DECIMAL(12,2) USING "price"::decimal;

ALTER TABLE "Order" ALTER COLUMN "estimatedTotal" TYPE DECIMAL(12,2) USING "estimatedTotal"::decimal;

ALTER TABLE "Sale" ALTER COLUMN "listPrice" TYPE DECIMAL(12,2) USING "listPrice"::decimal;
ALTER TABLE "Sale" ALTER COLUMN "discount" TYPE DECIMAL(12,2) USING "discount"::decimal;
ALTER TABLE "Sale" ALTER COLUMN "dealPrice" TYPE DECIMAL(12,2) USING "dealPrice"::decimal;

ALTER TABLE "Invoice" ALTER COLUMN "listPrice" TYPE DECIMAL(12,2) USING "listPrice"::decimal;
ALTER TABLE "Invoice" ALTER COLUMN "discount" TYPE DECIMAL(12,2) USING "discount"::decimal;
ALTER TABLE "Invoice" ALTER COLUMN "total" TYPE DECIMAL(12,2) USING "total"::decimal;

ALTER TABLE "MetalLot" ALTER COLUMN "purchaseRate" TYPE DECIMAL(12,2) USING "purchaseRate"::decimal;
ALTER TABLE "MetalLot" ALTER COLUMN "currentRate" TYPE DECIMAL(12,2) USING "currentRate"::decimal;

ALTER TABLE "StoneLot" ALTER COLUMN "purchaseRate" TYPE DECIMAL(12,2) USING "purchaseRate"::decimal;
ALTER TABLE "StoneLot" ALTER COLUMN "currentRate" TYPE DECIMAL(12,2) USING "currentRate"::decimal;

-- Step 6: CHECK constraints
ALTER TABLE "Product" ADD CONSTRAINT IF NOT EXISTS "Product_stock_non_negative" CHECK ("stock" >= 0);
ALTER TABLE "Product" ADD CONSTRAINT IF NOT EXISTS "Product_weightGrams_non_negative" CHECK ("weightGrams" >= 0);
ALTER TABLE "MetalLot" ADD CONSTRAINT IF NOT EXISTS "MetalLot_weightGrams_non_negative" CHECK ("weightGrams" >= 0);
ALTER TABLE "StoneLot" ADD CONSTRAINT IF NOT EXISTS "StoneLot_carat_non_negative" CHECK ("carat" >= 0);

-- Step 7 & 8: Audit and integrity log tables (Prisma migrate will create enums)
-- Enum conversion is handled by prisma db push / migrate deploy
