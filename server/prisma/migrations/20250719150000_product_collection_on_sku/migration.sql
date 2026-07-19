-- AlterTable
ALTER TABLE "Product" ADD COLUMN "productCollectionId" TEXT;

-- CreateIndex
CREATE INDEX "Product_productCollectionId_idx" ON "Product"("productCollectionId");

-- AddForeignKey
ALTER TABLE "Product" ADD CONSTRAINT "Product_productCollectionId_fkey" FOREIGN KEY ("productCollectionId") REFERENCES "ProductCollection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
