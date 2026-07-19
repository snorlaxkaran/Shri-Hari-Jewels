-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN IF NOT EXISTS "metalWastageAlertPercent" DECIMAL(5,2) NOT NULL DEFAULT 3.00;

-- CreateEnum
DO $$ BEGIN
  CREATE TYPE "QcResult" AS ENUM ('Pass', 'Fail');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE "NcrSeverity" AS ENUM ('Minor', 'Major', 'Critical');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "ProductionRunQcRecord" (
    "id" TEXT NOT NULL,
    "productionRunId" TEXT NOT NULL,
    "productionRunItemId" TEXT NOT NULL,
    "result" "QcResult" NOT NULL,
    "checklistResults" JSONB NOT NULL,
    "inspectedByName" TEXT NOT NULL,
    "photoUrls" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProductionRunQcRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "NonConformanceReport" (
    "id" TEXT NOT NULL,
    "qcRecordId" TEXT NOT NULL,
    "ncrNo" TEXT NOT NULL,
    "severity" "NcrSeverity" NOT NULL,
    "failedCriteria" TEXT[],
    "description" TEXT NOT NULL,
    "rootCause" TEXT,
    "correctiveAction" TEXT,
    "sentToStage" "ProductionRunStage" NOT NULL,
    "resolvedAt" TIMESTAMP(3),
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NonConformanceReport_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "NonConformanceReport_qcRecordId_key" ON "NonConformanceReport"("qcRecordId");
CREATE INDEX IF NOT EXISTS "ProductionRunQcRecord_productionRunId_idx" ON "ProductionRunQcRecord"("productionRunId");
CREATE INDEX IF NOT EXISTS "ProductionRunQcRecord_productionRunItemId_idx" ON "ProductionRunQcRecord"("productionRunItemId");
CREATE INDEX IF NOT EXISTS "NonConformanceReport_severity_idx" ON "NonConformanceReport"("severity");
CREATE INDEX IF NOT EXISTS "NonConformanceReport_ncrNo_idx" ON "NonConformanceReport"("ncrNo");

DO $$ BEGIN
  ALTER TABLE "ProductionRunQcRecord" ADD CONSTRAINT "ProductionRunQcRecord_productionRunId_fkey" FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "ProductionRunQcRecord" ADD CONSTRAINT "ProductionRunQcRecord_productionRunItemId_fkey" FOREIGN KEY ("productionRunItemId") REFERENCES "ProductionRunItem"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  ALTER TABLE "NonConformanceReport" ADD CONSTRAINT "NonConformanceReport_qcRecordId_fkey" FOREIGN KEY ("qcRecordId") REFERENCES "ProductionRunQcRecord"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
