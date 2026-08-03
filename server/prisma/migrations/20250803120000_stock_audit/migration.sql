-- CreateEnum
CREATE TYPE "StockAuditMetalGroup" AS ENUM ('Gold', 'Silver', 'Alloy');

-- CreateEnum
CREATE TYPE "StockAuditStatus" AS ENUM ('Open', 'Closed');

-- CreateTable
CREATE TABLE "StockAuditSession" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "metalGroup" "StockAuditMetalGroup" NOT NULL,
    "status" "StockAuditStatus" NOT NULL DEFAULT 'Open',
    "expectedCount" INTEGER NOT NULL,
    "startedById" TEXT NOT NULL,
    "startedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMP(3),

    CONSTRAINT "StockAuditSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockAuditScan" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "inventoryUnitId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "scannedById" TEXT NOT NULL,
    "scannedByName" TEXT NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockAuditScan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StockAuditSession_organizationId_branchId_metalGroup_status_idx" ON "StockAuditSession"("organizationId", "branchId", "metalGroup", "status");

-- CreateIndex
CREATE INDEX "StockAuditSession_branchId_idx" ON "StockAuditSession"("branchId");

-- CreateIndex
CREATE INDEX "StockAuditScan_sessionId_idx" ON "StockAuditScan"("sessionId");

-- CreateIndex
CREATE INDEX "StockAuditScan_inventoryUnitId_idx" ON "StockAuditScan"("inventoryUnitId");

-- CreateIndex
CREATE UNIQUE INDEX "StockAuditScan_sessionId_itemCode_key" ON "StockAuditScan"("sessionId", "itemCode");

-- AddForeignKey
ALTER TABLE "StockAuditSession" ADD CONSTRAINT "StockAuditSession_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAuditSession" ADD CONSTRAINT "StockAuditSession_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAuditScan" ADD CONSTRAINT "StockAuditScan_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "StockAuditSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockAuditScan" ADD CONSTRAINT "StockAuditScan_inventoryUnitId_fkey" FOREIGN KEY ("inventoryUnitId") REFERENCES "InventoryUnit"("id") ON DELETE CASCADE ON UPDATE CASCADE;
