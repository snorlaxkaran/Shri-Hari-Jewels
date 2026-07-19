-- Add GST header columns to Invoice (nullable first for backfill)
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "subtotal" DECIMAL(12,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "taxableValue" DECIMAL(12,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "cgst" DECIMAL(12,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "sgst" DECIMAL(12,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "igst" DECIMAL(12,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "roundOff" DECIMAL(12,2);
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "cartGroupId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "placeOfSupply" TEXT;

ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "hsnCode" TEXT;
ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS "metal" TEXT;
UPDATE "InvoiceItem" SET "metal" = 'Base Metal' WHERE "metal" IS NULL;

-- Backfill from line items where present
UPDATE "Invoice" i
SET
  "subtotal" = COALESCE(
    i."subtotal",
    (SELECT COALESCE(SUM(ii."listPrice"), 0) FROM "InvoiceItem" ii WHERE ii."invoiceId" = i."id")
  ),
  "taxableValue" = COALESCE(
    i."taxableValue",
    (SELECT COALESCE(SUM(ii."amount"), 0) FROM "InvoiceItem" ii WHERE ii."invoiceId" = i."id")
  )
WHERE i."subtotal" IS NULL OR i."taxableValue" IS NULL;

UPDATE "Invoice"
SET
  "subtotal" = COALESCE("subtotal", "total", 0),
  "taxableValue" = COALESCE("taxableValue", "total", 0),
  "discount" = COALESCE("discount", 0),
  "cgst" = COALESCE("cgst", 0),
  "sgst" = COALESCE("sgst", 0),
  "igst" = COALESCE("igst", 0),
  "roundOff" = COALESCE("roundOff", 0)
WHERE
  "subtotal" IS NULL
  OR "taxableValue" IS NULL
  OR "discount" IS NULL
  OR "cgst" IS NULL
  OR "sgst" IS NULL
  OR "igst" IS NULL
  OR "roundOff" IS NULL;

ALTER TABLE "Invoice" ALTER COLUMN "subtotal" SET DEFAULT 0;
ALTER TABLE "Invoice" ALTER COLUMN "taxableValue" SET DEFAULT 0;
ALTER TABLE "Invoice" ALTER COLUMN "discount" SET DEFAULT 0;
ALTER TABLE "Invoice" ALTER COLUMN "cgst" SET DEFAULT 0;
ALTER TABLE "Invoice" ALTER COLUMN "sgst" SET DEFAULT 0;
ALTER TABLE "Invoice" ALTER COLUMN "igst" SET DEFAULT 0;
ALTER TABLE "Invoice" ALTER COLUMN "roundOff" SET DEFAULT 0;

ALTER TABLE "Invoice" ALTER COLUMN "subtotal" SET NOT NULL;
ALTER TABLE "Invoice" ALTER COLUMN "taxableValue" SET NOT NULL;

UPDATE "InvoiceItem" SET "metal" = 'Base Metal' WHERE "metal" IS NULL;
ALTER TABLE "InvoiceItem" ALTER COLUMN "metal" SET DEFAULT 'Base Metal';
ALTER TABLE "InvoiceItem" ALTER COLUMN "metal" SET NOT NULL;
