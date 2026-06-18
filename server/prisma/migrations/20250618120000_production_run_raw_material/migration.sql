-- AlterTable: production run item lot selection and deduction tracking
ALTER TABLE "ProductionRunItem" ADD COLUMN IF NOT EXISTS "metalLotId" TEXT;
ALTER TABLE "ProductionRunItem" ADD COLUMN IF NOT EXISTS "stoneLotId" TEXT;
ALTER TABLE "ProductionRunItem" ADD COLUMN IF NOT EXISTS "metalWeightGrams" DOUBLE PRECISION;
ALTER TABLE "ProductionRunItem" ADD COLUMN IF NOT EXISTS "rawMaterialDeducted" BOOLEAN NOT NULL DEFAULT false;
