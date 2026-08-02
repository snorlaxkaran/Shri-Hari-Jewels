-- AlterTable
ALTER TABLE "ShopSettings" ADD COLUMN "setupImplementingFor" TEXT,
ADD COLUMN "setupTeamSize" TEXT,
ADD COLUMN "setupBusinessType" TEXT,
ADD COLUMN "setupCurrentSystem" TEXT,
ADD COLUMN "enabledModules" TEXT[] DEFAULT ARRAY['inventory', 'sales']::TEXT[],
ADD COLUMN "loadDemoData" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "dismissedModuleOnboarding" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- Existing tenants with real data skip the new setup gate
UPDATE "ShopSettings" s
SET "onboardingCompletedAt" = COALESCE(s."onboardingCompletedAt", NOW())
WHERE s."onboardingCompletedAt" IS NULL
  AND (
    s."businessName" IS DISTINCT FROM 'Jewellery Business'
    OR EXISTS (SELECT 1 FROM "Product" p WHERE p."organizationId" = s."organizationId")
  );
