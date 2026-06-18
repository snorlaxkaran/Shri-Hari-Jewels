-- Link production runs to finished goods products
ALTER TABLE "ProductionRun" ADD COLUMN IF NOT EXISTS "finishedGoodsProductId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "ProductionRun_finishedGoodsProductId_key" ON "ProductionRun"("finishedGoodsProductId");

ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "productionRunId" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "Product_productionRunId_key" ON "Product"("productionRunId");

ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_finishedGoodsProductId_fkey"
  FOREIGN KEY ("finishedGoodsProductId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
