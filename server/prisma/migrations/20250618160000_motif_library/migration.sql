-- CreateTable
CREATE TABLE "Motif" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "weightGrams" DOUBLE PRECISION,
    "metal" TEXT NOT NULL,
    "stone1" TEXT,
    "stone2" TEXT,
    "stone3" TEXT,
    "subCategory" TEXT NOT NULL,
    "price" DECIMAL(12,2),
    "imageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Motif_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Motif_branchId_idx" ON "Motif"("branchId");

-- CreateIndex
CREATE INDEX "Motif_subCategory_idx" ON "Motif"("subCategory");

-- CreateIndex
CREATE INDEX "Motif_metal_idx" ON "Motif"("metal");

-- CreateIndex
CREATE INDEX "Motif_name_idx" ON "Motif"("name");

-- AddForeignKey
ALTER TABLE "Motif" ADD CONSTRAINT "Motif_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;
