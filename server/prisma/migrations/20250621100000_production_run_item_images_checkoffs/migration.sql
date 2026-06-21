ALTER TABLE "ProductionRunItem" ADD COLUMN "motifId" TEXT;
ALTER TABLE "ProductionRunItem" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "ProductionRunItem" ADD COLUMN "stageCheckoffs" JSONB NOT NULL DEFAULT '{}';

-- Backfill motif images from linked design elements
UPDATE "ProductionRunItem" pri
SET
  "motifId" = de."motifId",
  "imageUrl" = m."imageUrl"
FROM "ProductionRun" pr
JOIN "DesignElement" de ON de."designId" = pr."designId" AND de."sortOrder" = pri."sortOrder"
LEFT JOIN "Motif" m ON m."id" = de."motifId"
WHERE pri."productionRunId" = pr."id"
  AND pri."motifId" IS NULL;
