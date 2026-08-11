-- Credit notes (sales returns) and debit notes (purchase returns)

ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "creditedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "creditStatus" TEXT NOT NULL DEFAULT 'None';

ALTER TABLE "PurchaseBill" ADD COLUMN IF NOT EXISTS "debitedTotal" DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE "EInvoiceRecord" ADD COLUMN IF NOT EXISTS "creditNoteId" TEXT;

CREATE TABLE IF NOT EXISTS "CreditNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "creditNoteNo" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerMobile" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "reasonText" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "taxableValue" DECIMAL(12,2) NOT NULL,
    "cgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "sgst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "igst" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "roundOff" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "refundMode" TEXT NOT NULL,
    "refundRef" TEXT,
    "status" TEXT NOT NULL DEFAULT 'Issued',
    "placeOfSupply" TEXT,
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditNote_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CreditNoteItem" (
    "id" TEXT NOT NULL,
    "creditNoteId" TEXT NOT NULL,
    "invoiceItemId" TEXT NOT NULL,
    "itemCode" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "hsnCode" TEXT,
    "metal" TEXT NOT NULL,
    "listPrice" DECIMAL(12,2) NOT NULL,
    "discount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "amount" DECIMAL(12,2) NOT NULL,
    "returnStock" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "CreditNoteItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "DebitNote" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "debitNoteNo" TEXT NOT NULL,
    "purchaseBillId" TEXT NOT NULL,
    "vendorId" TEXT NOT NULL,
    "entryVoucherId" TEXT,
    "reason" TEXT NOT NULL,
    "reasonText" TEXT,
    "subtotal" DECIMAL(12,2) NOT NULL,
    "gstAmount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'Issued',
    "createdById" TEXT,
    "createdByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebitNote_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CreditNote_organizationId_creditNoteNo_key" ON "CreditNote"("organizationId", "creditNoteNo");
CREATE INDEX IF NOT EXISTS "CreditNote_organizationId_idx" ON "CreditNote"("organizationId");
CREATE INDEX IF NOT EXISTS "CreditNote_branchId_idx" ON "CreditNote"("branchId");
CREATE INDEX IF NOT EXISTS "CreditNote_invoiceId_idx" ON "CreditNote"("invoiceId");
CREATE INDEX IF NOT EXISTS "CreditNote_createdAt_idx" ON "CreditNote"("createdAt");

CREATE INDEX IF NOT EXISTS "CreditNoteItem_creditNoteId_idx" ON "CreditNoteItem"("creditNoteId");
CREATE INDEX IF NOT EXISTS "CreditNoteItem_invoiceItemId_idx" ON "CreditNoteItem"("invoiceItemId");

CREATE UNIQUE INDEX IF NOT EXISTS "DebitNote_organizationId_debitNoteNo_key" ON "DebitNote"("organizationId", "debitNoteNo");
CREATE INDEX IF NOT EXISTS "DebitNote_organizationId_idx" ON "DebitNote"("organizationId");
CREATE INDEX IF NOT EXISTS "DebitNote_branchId_idx" ON "DebitNote"("branchId");
CREATE INDEX IF NOT EXISTS "DebitNote_purchaseBillId_idx" ON "DebitNote"("purchaseBillId");
CREATE INDEX IF NOT EXISTS "DebitNote_createdAt_idx" ON "DebitNote"("createdAt");

CREATE INDEX IF NOT EXISTS "EInvoiceRecord_creditNoteId_idx" ON "EInvoiceRecord"("creditNoteId");

ALTER TABLE "CreditNote" DROP CONSTRAINT IF EXISTS "CreditNote_organizationId_fkey";
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditNote" DROP CONSTRAINT IF EXISTS "CreditNote_branchId_fkey";
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditNote" DROP CONSTRAINT IF EXISTS "CreditNote_invoiceId_fkey";
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "CreditNote" DROP CONSTRAINT IF EXISTS "CreditNote_customerId_fkey";
ALTER TABLE "CreditNote" ADD CONSTRAINT "CreditNote_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "CreditNoteItem" DROP CONSTRAINT IF EXISTS "CreditNoteItem_creditNoteId_fkey";
ALTER TABLE "CreditNoteItem" ADD CONSTRAINT "CreditNoteItem_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "CreditNote"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "CreditNoteItem" DROP CONSTRAINT IF EXISTS "CreditNoteItem_invoiceItemId_fkey";
ALTER TABLE "CreditNoteItem" ADD CONSTRAINT "CreditNoteItem_invoiceItemId_fkey" FOREIGN KEY ("invoiceItemId") REFERENCES "InvoiceItem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DebitNote" DROP CONSTRAINT IF EXISTS "DebitNote_organizationId_fkey";
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DebitNote" DROP CONSTRAINT IF EXISTS "DebitNote_branchId_fkey";
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "DebitNote" DROP CONSTRAINT IF EXISTS "DebitNote_purchaseBillId_fkey";
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_purchaseBillId_fkey" FOREIGN KEY ("purchaseBillId") REFERENCES "PurchaseBill"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DebitNote" DROP CONSTRAINT IF EXISTS "DebitNote_vendorId_fkey";
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "Vendor"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DebitNote" DROP CONSTRAINT IF EXISTS "DebitNote_entryVoucherId_fkey";
ALTER TABLE "DebitNote" ADD CONSTRAINT "DebitNote_entryVoucherId_fkey" FOREIGN KEY ("entryVoucherId") REFERENCES "EntryVoucher"("id") ON DELETE SET NULL ON UPDATE CASCADE;
