ALTER TABLE "ProductionRun" ADD COLUMN IF NOT EXISTS "metalInventoryDeducted" BOOLEAN NOT NULL DEFAULT false;
