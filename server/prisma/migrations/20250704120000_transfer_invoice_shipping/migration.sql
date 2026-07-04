-- Link from Sale back to the transfer that created it (for Wholesale Invoice transfers)
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "stockTransferId" TEXT;
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "saleSource"      TEXT NOT NULL DEFAULT 'Direct';

-- Transfer-level invoice number for Wholesale GST Invoice document type
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "invoiceNo"  TEXT;
ALTER TABLE "StockTransfer" ADD COLUMN IF NOT EXISTS "invoicedAt" TIMESTAMP(3);

-- Delivery Challan transfers mark units as Transferred (not Sold)
ALTER TYPE "InventoryUnitStatus" ADD VALUE 'Transferred';
