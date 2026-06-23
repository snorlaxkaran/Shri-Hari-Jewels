-- Multi-tenant organizations: add Organization model and scope existing data

CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "emailDomain" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Organization_slug_key" ON "Organization"("slug");

-- Default organization for existing Shri Hari data
INSERT INTO "Organization" ("id", "name", "slug", "emailDomain", "active", "createdAt", "updatedAt")
VALUES (
    'org-shree-hari-jewels',
    'Shree Hari Jewels',
    'shree-hari-jewels',
    'shreehari.com',
    true,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
);

-- Super admin is created by seed (admin@karan.com)

ALTER TABLE "Branch" ADD COLUMN "organizationId" TEXT;

UPDATE "Branch" SET "organizationId" = 'org-shree-hari-jewels' WHERE "organizationId" IS NULL;

ALTER TABLE "Branch" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "User" ADD COLUMN "organizationId" TEXT;

UPDATE "User" SET "organizationId" = 'org-shree-hari-jewels'
WHERE "organizationId" IS NULL AND "role" != 'SuperAdmin';

ALTER TABLE "Customer" ADD COLUMN "organizationId" TEXT;

UPDATE "Customer" SET "organizationId" = 'org-shree-hari-jewels' WHERE "organizationId" IS NULL;

ALTER TABLE "Customer" ALTER COLUMN "organizationId" SET NOT NULL;

-- ShopSettings: migrate from singleton id to per-organization
ALTER TABLE "ShopSettings" ADD COLUMN "organizationId" TEXT;

UPDATE "ShopSettings" SET "organizationId" = 'org-shree-hari-jewels' WHERE "organizationId" IS NULL;

ALTER TABLE "ShopSettings" ALTER COLUMN "organizationId" SET NOT NULL;

ALTER TABLE "ShopSettings" ALTER COLUMN "id" DROP DEFAULT;

DROP INDEX IF EXISTS "Customer_mobile_key";

CREATE UNIQUE INDEX "Customer_organizationId_mobile_key" ON "Customer"("organizationId", "mobile");
CREATE UNIQUE INDEX "ShopSettings_organizationId_key" ON "ShopSettings"("organizationId");
CREATE INDEX "Branch_organizationId_idx" ON "Branch"("organizationId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");
CREATE INDEX "Customer_organizationId_idx" ON "Customer"("organizationId");

ALTER TABLE "Branch" ADD CONSTRAINT "Branch_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "ShopSettings" ADD CONSTRAINT "ShopSettings_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Customer" ADD CONSTRAINT "Customer_organizationId_fkey"
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
