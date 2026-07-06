-- New top-level fields on Customer
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "companyName"       TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "ownerName"         TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "contactPersonName" TEXT;
ALTER TABLE "Customer" ADD COLUMN IF NOT EXISTS "customerType"      TEXT NOT NULL DEFAULT 'Individual Buyer';

-- Office type on CustomerBranch
ALTER TABLE "CustomerBranch" ADD COLUMN IF NOT EXISTS "officeType"  TEXT NOT NULL DEFAULT 'Branch Office';

-- New table for department-wise contacts
CREATE TABLE IF NOT EXISTS "CustomerDepartmentContact" (
  "id"             TEXT         NOT NULL DEFAULT gen_random_uuid()::text,
  "customerId"     TEXT         NOT NULL,
  "department"     TEXT         NOT NULL,
  "personName"     TEXT         NOT NULL,
  "email"          TEXT,
  "phone"          TEXT,
  "createdByUserId" TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerDepartmentContact_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CustomerDepartmentContact_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "CustomerDepartmentContact_customerId_idx"
  ON "CustomerDepartmentContact"("customerId");
