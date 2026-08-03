-- AlterTable
ALTER TABLE "StorefrontSettings" ADD COLUMN IF NOT EXISTS "bannerUrls" JSONB;

-- Backfill carousel from legacy single banner
UPDATE "StorefrontSettings"
SET "bannerUrls" = jsonb_build_array("bannerUrl")
WHERE "bannerUrl" IS NOT NULL
  AND TRIM("bannerUrl") <> ''
  AND ("bannerUrls" IS NULL OR "bannerUrls" = '[]'::jsonb);
