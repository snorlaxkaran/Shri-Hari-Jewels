-- CreateTable
CREATE TABLE "CustomerBranch" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "branchId" TEXT,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "state" TEXT,
    "pincode" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerBranch_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "StockTransfer" ADD COLUMN "customerId" TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN "customerBranchId" TEXT;

-- CreateIndex
CREATE INDEX "CustomerBranch_customerId_idx" ON "CustomerBranch"("customerId");
CREATE INDEX "CustomerBranch_branchId_idx" ON "CustomerBranch"("branchId");
CREATE INDEX "CustomerBranch_customerId_active_idx" ON "CustomerBranch"("customerId", "active");
CREATE INDEX "StockTransfer_customerId_idx" ON "StockTransfer"("customerId");
CREATE INDEX "StockTransfer_customerBranchId_idx" ON "StockTransfer"("customerBranchId");

-- AddForeignKey
ALTER TABLE "CustomerBranch" ADD CONSTRAINT "CustomerBranch_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CustomerBranch" ADD CONSTRAINT "CustomerBranch_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StockTransfer" ADD CONSTRAINT "StockTransfer_customerBranchId_fkey" FOREIGN KEY ("customerBranchId") REFERENCES "CustomerBranch"("id") ON DELETE SET NULL ON UPDATE CASCADE;
