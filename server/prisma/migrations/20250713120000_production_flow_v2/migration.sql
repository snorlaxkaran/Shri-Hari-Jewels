-- CreateEnum
CREATE TYPE "StageLogAction" AS ENUM ('Started', 'Completed', 'Rejected');

-- CreateEnum
CREATE TYPE "DesignApprovalStatus" AS ENUM ('Draft', 'PendingApproval', 'Approved', 'Rejected');

-- AlterTable: Design approval fields
ALTER TABLE "Design" ADD COLUMN "approvalStatus" "DesignApprovalStatus" NOT NULL DEFAULT 'Draft';
ALTER TABLE "Design" ADD COLUMN "approvedById" TEXT;
ALTER TABLE "Design" ADD COLUMN "approvedByName" TEXT;
ALTER TABLE "Design" ADD COLUMN "approvedAt" TIMESTAMP(3);
ALTER TABLE "Design" ADD COLUMN "rejectionReason" TEXT;

-- AlterTable: ProductionRunStageLog enhancements
ALTER TABLE "ProductionRunStageLog" ADD COLUMN "action" "StageLogAction" NOT NULL DEFAULT 'Started';
ALTER TABLE "ProductionRunStageLog" ADD COLUMN "karigarName" TEXT;
ALTER TABLE "ProductionRunStageLog" ADD COLUMN "rejectionReason" TEXT;
ALTER TABLE "ProductionRunStageLog" ADD COLUMN "rejectedToStage" "ProductionRunStage";

-- CreateTable: ProductionRunMetalIssue
CREATE TABLE "ProductionRunMetalIssue" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "stage" "ProductionRunStage" NOT NULL,
    "metalLotId" TEXT,
    "karigarName" TEXT NOT NULL,
    "purity" TEXT NOT NULL,
    "weightIssuedGrams" DECIMAL(10,3) NOT NULL,
    "weightReturnedGrams" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "weightLossGrams" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "lossReason" TEXT,
    "status" "StoneIssueStatus" NOT NULL DEFAULT 'Open',
    "issuedByName" TEXT NOT NULL,
    "settledByName" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "settledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductionRunMetalIssue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductionRunMetalIssue_branchId_idx" ON "ProductionRunMetalIssue"("branchId");
CREATE INDEX "ProductionRunMetalIssue_productionRunId_idx" ON "ProductionRunMetalIssue"("productionRunId");
CREATE INDEX "ProductionRunMetalIssue_stage_idx" ON "ProductionRunMetalIssue"("stage");
CREATE INDEX "ProductionRunMetalIssue_status_idx" ON "ProductionRunMetalIssue"("status");

-- AddForeignKey
ALTER TABLE "ProductionRunMetalIssue" ADD CONSTRAINT "ProductionRunMetalIssue_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRunMetalIssue" ADD CONSTRAINT "ProductionRunMetalIssue_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductionRunMetalIssue" ADD CONSTRAINT "ProductionRunMetalIssue_metalLotId_fkey" FOREIGN KEY ("metalLotId") REFERENCES "MetalLot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
