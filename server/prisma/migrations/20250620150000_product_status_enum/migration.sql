-- Safe TEXT -> enum conversion for legacy databases (e.g. Render production).
-- Idempotent: no-op when Product.status is already ProductStockStatus.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'Product'
      AND column_name = 'status'
      AND udt_name IN ('text', 'varchar', 'character varying')
  ) THEN
    CREATE TYPE "ProductStockStatus" AS ENUM ('In Stock', 'Low Stock', 'Out of Stock');
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
EXCEPTION
  WHEN duplicate_object THEN
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
END $$;
