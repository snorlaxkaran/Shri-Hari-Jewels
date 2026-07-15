-- Tenant storefront: settings, collections, web orders, product publishing

-- AlterTable Organization
ALTER TABLE "Organization" ADD COLUMN "customDomain" TEXT;
CREATE UNIQUE INDEX "Organization_customDomain_key" ON "Organization"("customDomain");

-- AlterTable Product
ALTER TABLE "Product" ADD COLUMN "publishedToStorefront" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Product" ADD COLUMN "storefrontDescription" TEXT;

-- CreateEnum
CREATE TYPE "WebOrderStatus" AS ENUM ('Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled');
CREATE TYPE "WebOrderPaymentStatus" AS ENUM ('Unpaid', 'Paid', 'Refunded');

-- CreateTable StorefrontSettings
CREATE TABLE "StorefrontSettings" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "tagline" TEXT,
    "heroTitle" TEXT,
    "heroSubtitle" TEXT,
    "aboutText" TEXT,
    "primaryColor" TEXT NOT NULL DEFAULT '#b8860b',
    "accentColor" TEXT NOT NULL DEFAULT '#1a1a1a',
    "logoUrl" TEXT,
    "bannerUrl" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "instagramUrl" TEXT,
    "facebookUrl" TEXT,
    "whatsappNumber" TEXT,
    "shippingNote" TEXT,
    "returnPolicy" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable StorefrontCollection
CREATE TABLE "StorefrontCollection" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "imageUrl" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StorefrontCollection_pkey" PRIMARY KEY ("id")
);

-- CreateTable StorefrontCollectionProduct
CREATE TABLE "StorefrontCollectionProduct" (
    "id" TEXT NOT NULL,
    "collectionId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "StorefrontCollectionProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable WebOrder
CREATE TABLE "WebOrder" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "orderNo" TEXT NOT NULL,
    "customerId" TEXT,
    "customerName" TEXT NOT NULL,
    "customerEmail" TEXT,
    "customerMobile" TEXT NOT NULL,
    "addressLine1" TEXT NOT NULL,
    "addressLine2" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "pincode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'India',
    "status" "WebOrderStatus" NOT NULL DEFAULT 'Pending',
    "paymentStatus" "WebOrderPaymentStatus" NOT NULL DEFAULT 'Unpaid',
    "totalAmount" DECIMAL(12,2) NOT NULL,
    "notes" TEXT,
    "erpOrderId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable WebOrderItem
CREATE TABLE "WebOrderItem" (
    "id" TEXT NOT NULL,
    "webOrderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "productSku" TEXT NOT NULL,
    "productName" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(12,2) NOT NULL,
    "lineTotal" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "WebOrderItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorefrontSettings_organizationId_key" ON "StorefrontSettings"("organizationId");
CREATE UNIQUE INDEX "StorefrontCollection_organizationId_slug_key" ON "StorefrontCollection"("organizationId", "slug");
CREATE INDEX "StorefrontCollection_organizationId_idx" ON "StorefrontCollection"("organizationId");
CREATE UNIQUE INDEX "StorefrontCollectionProduct_collectionId_productId_key" ON "StorefrontCollectionProduct"("collectionId", "productId");
CREATE INDEX "StorefrontCollectionProduct_collectionId_idx" ON "StorefrontCollectionProduct"("collectionId");
CREATE INDEX "StorefrontCollectionProduct_productId_idx" ON "StorefrontCollectionProduct"("productId");
CREATE UNIQUE INDEX "WebOrder_organizationId_orderNo_key" ON "WebOrder"("organizationId", "orderNo");
CREATE INDEX "WebOrder_organizationId_idx" ON "WebOrder"("organizationId");
CREATE INDEX "WebOrder_branchId_idx" ON "WebOrder"("branchId");
CREATE INDEX "WebOrder_status_idx" ON "WebOrder"("status");
CREATE INDEX "WebOrder_createdAt_idx" ON "WebOrder"("createdAt");
CREATE INDEX "WebOrderItem_webOrderId_idx" ON "WebOrderItem"("webOrderId");
CREATE INDEX "WebOrderItem_productId_idx" ON "WebOrderItem"("productId");

-- AddForeignKey
ALTER TABLE "StorefrontSettings" ADD CONSTRAINT "StorefrontSettings_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorefrontCollection" ADD CONSTRAINT "StorefrontCollection_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorefrontCollectionProduct" ADD CONSTRAINT "StorefrontCollectionProduct_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "StorefrontCollection"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StorefrontCollectionProduct" ADD CONSTRAINT "StorefrontCollectionProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebOrder" ADD CONSTRAINT "WebOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebOrder" ADD CONSTRAINT "WebOrder_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebOrder" ADD CONSTRAINT "WebOrder_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebOrderItem" ADD CONSTRAINT "WebOrderItem_webOrderId_fkey" FOREIGN KEY ("webOrderId") REFERENCES "WebOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebOrderItem" ADD CONSTRAINT "WebOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill StorefrontSettings for existing organizations
INSERT INTO "StorefrontSettings" ("id", "organizationId", "enabled", "primaryColor", "accentColor", "updatedAt")
SELECT gen_random_uuid()::text, "id", false, '#b8860b', '#1a1a1a', NOW()
FROM "Organization"
WHERE NOT EXISTS (
  SELECT 1 FROM "StorefrontSettings" s WHERE s."organizationId" = "Organization"."id"
);
