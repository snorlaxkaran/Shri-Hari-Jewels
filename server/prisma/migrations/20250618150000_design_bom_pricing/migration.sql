-- AlterTable
ALTER TABLE "Design" ADD COLUMN "metal" TEXT,
ADD COLUMN "purity" TEXT,
ADD COLUMN "makingChargesPerSet" DECIMAL(12,2);

-- AlterTable
ALTER TABLE "DesignElement" ADD COLUMN "unitValue" DECIMAL(12,2),
ADD COLUMN "weightGramsPerPc" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "ProductionRunItem" ADD COLUMN "unitValue" DECIMAL(12,2),
ADD COLUMN "weightGramsPerPc" DOUBLE PRECISION;
