-- Customer: structured billing address, tax & bank details
ALTER TABLE "Customer" ADD COLUMN "billingAddressLine1" TEXT;
ALTER TABLE "Customer" ADD COLUMN "billingAddressLine2" TEXT;
ALTER TABLE "Customer" ADD COLUMN "billingCity" TEXT;
ALTER TABLE "Customer" ADD COLUMN "billingState" TEXT;
ALTER TABLE "Customer" ADD COLUMN "billingPincode" TEXT;
ALTER TABLE "Customer" ADD COLUMN "billingCountry" TEXT DEFAULT 'India';
ALTER TABLE "Customer" ADD COLUMN "panNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN "gstNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN "gstRegisteredName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "bankAccountName" TEXT;
ALTER TABLE "Customer" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "Customer" ADD COLUMN "bankIfsc" TEXT;
ALTER TABLE "Customer" ADD COLUMN "bankName" TEXT;

UPDATE "Customer"
SET
  "billingAddressLine1" = "address",
  "billingCity" = "city"
WHERE "billingAddressLine1" IS NULL
  AND ("address" IS NOT NULL OR "city" IS NOT NULL);

-- ShopSettings: structured address, tax & bank details
ALTER TABLE "ShopSettings" ADD COLUMN "addressLine1" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "addressLine2" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "city" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "state" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "pincode" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "country" TEXT DEFAULT 'India';
ALTER TABLE "ShopSettings" ADD COLUMN "panNumber" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "gstNumber" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "gstRegisteredName" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "bankAccountName" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "bankAccountNumber" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "bankIfsc" TEXT;
ALTER TABLE "ShopSettings" ADD COLUMN "bankName" TEXT;

UPDATE "ShopSettings"
SET "addressLine1" = "address"
WHERE "addressLine1" IS NULL AND "address" IS NOT NULL;
