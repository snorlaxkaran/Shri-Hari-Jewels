-- Organization module entitlements (source of truth for feature access)
ALTER TABLE "Organization" ADD COLUMN "enabledModules" TEXT[] NOT NULL DEFAULT ARRAY['inventory', 'sales'];

UPDATE "Organization" o
SET "enabledModules" = s."enabledModules"
FROM "ShopSettings" s
WHERE s."organizationId" = o.id;

-- Manual product-to-product recommendations for storefront PDP
CREATE TABLE "ProductRelatedProduct" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "relatedProductId" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProductRelatedProduct_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ProductRelatedProduct_productId_relatedProductId_key" ON "ProductRelatedProduct"("productId", "relatedProductId");
CREATE INDEX "ProductRelatedProduct_productId_idx" ON "ProductRelatedProduct"("productId");
CREATE INDEX "ProductRelatedProduct_relatedProductId_idx" ON "ProductRelatedProduct"("relatedProductId");

ALTER TABLE "ProductRelatedProduct" ADD CONSTRAINT "ProductRelatedProduct_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProductRelatedProduct" ADD CONSTRAINT "ProductRelatedProduct_relatedProductId_fkey" FOREIGN KEY ("relatedProductId") REFERENCES "Product"("id") ON DELETE CASCADE ON UPDATE CASCADE;
