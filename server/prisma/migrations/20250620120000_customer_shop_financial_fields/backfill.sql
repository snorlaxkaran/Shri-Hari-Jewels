UPDATE "Customer"
SET
  "billingAddressLine1" = "address",
  "billingCity" = "city"
WHERE "billingAddressLine1" IS NULL
  AND ("address" IS NOT NULL OR "city" IS NOT NULL);

UPDATE "ShopSettings"
SET "addressLine1" = "address"
WHERE "addressLine1" IS NULL AND "address" IS NOT NULL;
