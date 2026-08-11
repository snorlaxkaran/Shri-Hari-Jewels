-- CreateTable
CREATE TABLE "DropdownOption" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "fieldKey" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DropdownOption_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DropdownOption_organizationId_fieldKey_idx" ON "DropdownOption"("organizationId", "fieldKey");

-- CreateIndex
CREATE INDEX "DropdownOption_active_idx" ON "DropdownOption"("active");

-- CreateIndex
CREATE UNIQUE INDEX "DropdownOption_organizationId_fieldKey_value_key" ON "DropdownOption"("organizationId", "fieldKey", "value");

-- AddForeignKey
ALTER TABLE "DropdownOption" ADD CONSTRAINT "DropdownOption_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
