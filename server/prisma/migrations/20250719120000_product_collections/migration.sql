-- CreateTable
CREATE TABLE "ProductCollection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProductCollection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProductCollection_organizationId_idx" ON "ProductCollection"("organizationId");

-- CreateIndex
CREATE INDEX "ProductCollection_isActive_idx" ON "ProductCollection"("isActive");

-- CreateIndex
CREATE UNIQUE INDEX "ProductCollection_organizationId_name_key" ON "ProductCollection"("organizationId", "name");

-- AddForeignKey
ALTER TABLE "ProductCollection" ADD CONSTRAINT "ProductCollection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
