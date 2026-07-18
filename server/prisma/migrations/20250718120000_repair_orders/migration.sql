-- CreateEnum
CREATE TYPE "RepairStatus" AS ENUM ('Received', 'Estimated', 'Awaiting Approval', 'Approved', 'In Progress', 'Quality Check', 'Ready for Pickup', 'Delivered', 'Rejected', 'Cancelled');

-- AlterTable
ALTER TABLE "Invoice" ADD COLUMN "repairOrderId" TEXT;

-- AlterTable
ALTER TABLE "InvoiceItem" ALTER COLUMN "saleId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "RepairOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "repairNo" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerMobile" TEXT NOT NULL,
    "itemDescription" TEXT NOT NULL,
    "intakeCondition" TEXT,
    "intakePhotoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "requestedWork" TEXT NOT NULL,
    "estimatedCost" DECIMAL(12,2),
    "estimatedReadyDate" TIMESTAMP(3),
    "depositAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "finalCost" DECIMAL(12,2),
    "status" "RepairStatus" NOT NULL DEFAULT 'Received',
    "assignedKarigarName" TEXT,
    "approvedAt" TIMESTAMP(3),
    "approvedVia" TEXT,
    "rejectionReason" TEXT,
    "deliveredAt" TIMESTAMP(3),
    "deliveredToName" TEXT,
    "redoOf" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairStatusLog" (
    "id" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "status" "RepairStatus" NOT NULL,
    "notes" TEXT,
    "performedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairStatusLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RepairPhoto" (
    "id" TEXT NOT NULL,
    "repairOrderId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RepairPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RepairOrder_organizationId_idx" ON "RepairOrder"("organizationId");

-- CreateIndex
CREATE INDEX "RepairOrder_branchId_idx" ON "RepairOrder"("branchId");

-- CreateIndex
CREATE INDEX "RepairOrder_status_idx" ON "RepairOrder"("status");

-- CreateIndex
CREATE INDEX "RepairOrder_customerId_idx" ON "RepairOrder"("customerId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairOrder_organizationId_repairNo_key" ON "RepairOrder"("organizationId", "repairNo");

-- CreateIndex
CREATE INDEX "RepairStatusLog_repairOrderId_idx" ON "RepairStatusLog"("repairOrderId");

-- CreateIndex
CREATE INDEX "RepairPhoto_repairOrderId_idx" ON "RepairPhoto"("repairOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "Invoice_repairOrderId_key" ON "Invoice"("repairOrderId");

-- AddForeignKey
ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairOrder" ADD CONSTRAINT "RepairOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairStatusLog" ADD CONSTRAINT "RepairStatusLog_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RepairPhoto" ADD CONSTRAINT "RepairPhoto_repairOrderId_fkey" FOREIGN KEY ("repairOrderId") REFERENCES "RepairOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
