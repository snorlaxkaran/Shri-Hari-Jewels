-- CreateTable
CREATE TABLE "StoneType" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StoneType_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "StoneType_organizationId_idx" ON "StoneType"("organizationId");

-- CreateIndex
CREATE INDEX "StoneType_isActive_idx" ON "StoneType"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "StoneType_organizationId_name_key" ON "StoneType"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "StoneType" ADD CONSTRAINT "StoneType_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
