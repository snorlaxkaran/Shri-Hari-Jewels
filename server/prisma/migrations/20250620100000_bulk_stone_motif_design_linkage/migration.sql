-- BulkStoneLot master inventory for sized bulk stones
CREATE TABLE "BulkStoneLot" (
    "id" TEXT NOT NULL,
    "branchId" TEXT NOT NULL,
    "sizeLabel" TEXT NOT NULL,
    "stoneType" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerStone" DECIMAL(12,4) NOT NULL,
    "vendor" TEXT,
    "lotReference" TEXT,
    "purchaseDate" TIMESTAMP(3),
    "location" TEXT NOT NULL DEFAULT 'Main Vault',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BulkStoneLot_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BulkStoneLot_branchId_idx" ON "BulkStoneLot"("branchId");
CREATE INDEX "BulkStoneLot_stoneType_idx" ON "BulkStoneLot"("stoneType");
CREATE INDEX "BulkStoneLot_sizeLabel_idx" ON "BulkStoneLot"("sizeLabel");

ALTER TABLE "BulkStoneLot" ADD CONSTRAINT "BulkStoneLot_branchId_fkey"
    FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- MotifStone junction (motif → bulk stone lot with qty)
CREATE TABLE "MotifStone" (
    "id" TEXT NOT NULL,
    "motifId" TEXT NOT NULL,
    "bulkStoneLotId" TEXT NOT NULL,
    "qtyPerMotif" INTEGER NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "MotifStone_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MotifStone_motifId_idx" ON "MotifStone"("motifId");
CREATE INDEX "MotifStone_bulkStoneLotId_idx" ON "MotifStone"("bulkStoneLotId");

ALTER TABLE "MotifStone" ADD CONSTRAINT "MotifStone_motifId_fkey"
    FOREIGN KEY ("motifId") REFERENCES "Motif"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "MotifStone" ADD CONSTRAINT "MotifStone_bulkStoneLotId_fkey"
    FOREIGN KEY ("bulkStoneLotId") REFERENCES "BulkStoneLot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Motif making cost (non-stone component of price)
ALTER TABLE "Motif" ADD COLUMN "makingCost" DECIMAL(12,2);

-- DesignElement → Motif FK
ALTER TABLE "DesignElement" ADD COLUMN "motifId" TEXT;

CREATE INDEX "DesignElement_motifId_idx" ON "DesignElement"("motifId");

ALTER TABLE "DesignElement" ADD CONSTRAINT "DesignElement_motifId_fkey"
    FOREIGN KEY ("motifId") REFERENCES "Motif"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Catalog audit log for Design / Motif changes
CREATE TABLE "CatalogAuditLog" (
    "id" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "entityRef" TEXT,
    "action" TEXT NOT NULL,
    "previousValue" TEXT,
    "newValue" TEXT,
    "reason" TEXT,
    "performedById" TEXT,
    "performedByName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CatalogAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CatalogAuditLog_entityType_entityId_idx" ON "CatalogAuditLog"("entityType", "entityId");
CREATE INDEX "CatalogAuditLog_createdAt_idx" ON "CatalogAuditLog"("createdAt");
