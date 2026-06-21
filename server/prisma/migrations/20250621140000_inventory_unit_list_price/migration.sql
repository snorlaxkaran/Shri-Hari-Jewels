ALTER TABLE "InventoryUnit" ADD COLUMN IF NOT EXISTS "listPrice" DECIMAL(12,2);

UPDATE "InventoryUnit" AS u
SET "listPrice" = p."price"
FROM "Product" AS p
WHERE u."productId" = p."id"
  AND u."listPrice" IS NULL;

UPDATE "InventoryUnit" AS u
SET "listPrice" = s."listPrice"
FROM "Sale" AS s
WHERE s."unitId" = u."id"
  AND u."status" IN ('Sold', 'Reserved');
