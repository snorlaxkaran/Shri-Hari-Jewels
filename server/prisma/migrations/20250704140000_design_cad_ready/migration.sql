ALTER TABLE "Design" ADD COLUMN IF NOT EXISTS "cadReady"  BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Design" ADD COLUMN IF NOT EXISTS "cadNotes"  TEXT;
-- Backfill: any design that already has a cadFileUrl is considered CAD ready
UPDATE "Design" SET "cadReady" = true WHERE "cadFileUrl" IS NOT NULL;
