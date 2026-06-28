-- Scope design codes, SKUs, barcodes, and production run numbers per organization

ALTER TABLE "Design" ADD COLUMN "organizationId" TEXT;

UPDATE "Design" d
SET "organizationId" = b."organizationId"
FROM "Branch" b
WHERE d."branchId" = b."id";

ALTER TABLE "Design" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "Product" ADD COLUMN "organizationId" TEXT;

UPDATE "Product" p
SET "organizationId" = b."organizationId"
FROM "Branch" b
WHERE p."branchId" = b."id";

ALTER TABLE "Product" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "InventoryUnit" ADD COLUMN "organizationId" TEXT;

UPDATE "InventoryUnit" u
SET "organizationId" = b."organizationId"
FROM "Branch" b
WHERE u."branchId" = b."id";

ALTER TABLE "InventoryUnit" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "ProductionRun" ADD COLUMN "organizationId" TEXT;

UPDATE "ProductionRun" r
SET "organizationId" = b."organizationId"
FROM "Branch" b
WHERE r."branchId" = b."id";

ALTER TABLE "ProductionRun" ALTER COLUMN "organizationId" SET NOT NULL;

DROP INDEX IF EXISTS "Design_code_key";
DROP INDEX IF EXISTS "Product_sku_key";
DROP INDEX IF EXISTS "InventoryUnit_itemCode_key";
DROP INDEX IF EXISTS "ProductionRun_runNo_key";

CREATE UNIQUE INDEX "Design_organizationId_code_key" ON "Design"("organizationId", "code");
CREATE UNIQUE INDEX "Product_organizationId_sku_key" ON "Product"("organizationId", "sku");
CREATE UNIQUE INDEX "InventoryUnit_organizationId_itemCode_key" ON "InventoryUnit"("organizationId", "itemCode");
CREATE UNIQUE INDEX "ProductionRun_organizationId_runNo_key" ON "ProductionRun"("organizationId", "runNo");

CREATE INDEX "Design_organizationId_idx" ON "Design"("organizationId");
CREATE INDEX "Product_organizationId_idx" ON "Product"("organizationId");
CREATE INDEX "InventoryUnit_organizationId_idx" ON "InventoryUnit"("organizationId");
CREATE INDEX "ProductionRun_organizationId_idx" ON "ProductionRun"("organizationId");

ALTER TABLE "Design" ADD CONSTRAINT "Design_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Product" ADD CONSTRAINT "Product_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "InventoryUnit" ADD CONSTRAINT "InventoryUnit_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ProductionRun" ADD CONSTRAINT "ProductionRun_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
