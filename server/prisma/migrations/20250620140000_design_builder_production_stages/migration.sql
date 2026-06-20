-- Design builder stages + production run stage tracking

CREATE TYPE "DesignBuilderStage" AS ENUM ('SKU', 'CAD', 'Mold Making', 'Motifs', 'Photo', 'Complete');
CREATE TYPE "ProductionRunStage" AS ENUM (
  'Wax Pattern',
  'Casting',
  'Cleaning',
  'Assembly',
  'Prepolish',
  'Stone Setting',
  'Final Polishing',
  'Plating',
  'Quality Check',
  'Packaging'
);

ALTER TABLE "Design" ADD COLUMN "builderStage" "DesignBuilderStage" NOT NULL DEFAULT 'SKU';
ALTER TABLE "Design" ADD COLUMN "cadFileUrl" TEXT;
ALTER TABLE "Design" ADD COLUMN "cadCompletedAt" TIMESTAMP(3);
ALTER TABLE "Design" ADD COLUMN "moldNotes" TEXT;
ALTER TABLE "Design" ADD COLUMN "moldPhotoUrl" TEXT;
ALTER TABLE "Design" ADD COLUMN "moldCompletedAt" TIMESTAMP(3);
ALTER TABLE "Design" ADD COLUMN "finishedPhotoUrl" TEXT;
ALTER TABLE "Design" ADD COLUMN "builderCompletedAt" TIMESTAMP(3);
CREATE INDEX "Design_builderStage_idx" ON "Design"("builderStage");

ALTER TABLE "ProductionRun" ADD COLUMN "currentStage" "ProductionRunStage" NOT NULL DEFAULT 'Wax Pattern';
CREATE INDEX "ProductionRun_currentStage_idx" ON "ProductionRun"("currentStage");

CREATE TABLE "ProductionRunStageLog" (
  "id" TEXT NOT NULL,
  "productionRunId" TEXT NOT NULL,
  "stage" "ProductionRunStage" NOT NULL,
  "notes" TEXT,
  "performedById" TEXT,
  "performedByName" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ProductionRunStageLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProductionRunStageLog_productionRunId_idx" ON "ProductionRunStageLog"("productionRunId");
CREATE INDEX "ProductionRunStageLog_stage_idx" ON "ProductionRunStageLog"("stage");
CREATE INDEX "ProductionRunStageLog_createdAt_idx" ON "ProductionRunStageLog"("createdAt");

ALTER TABLE "ProductionRunStageLog"
  ADD CONSTRAINT "ProductionRunStageLog_productionRunId_fkey"
  FOREIGN KEY ("productionRunId") REFERENCES "ProductionRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;
