-- Deprecate and remove the BulkStoneLot model.
-- Any rows created after the 20250624100000_stone_master_inventory migration
-- are migrated into the real StoneMaster / StoneLot ledger before the table is
-- dropped. All inserts are guarded so re-running (or previously-migrated rows)
-- never create duplicates.

-- 1. Ensure a generic StoneMaster entry exists for every remaining BulkStoneLot.
INSERT INTO "StoneMaster" (
  "id", "organizationId", "stoneCode", "stoneName", "stoneCategory", "stoneType",
  "stoneMaterial", "shape", "sizeMm", "color", "uom", "isActive", "createdByName", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  b."organizationId",
  'BS-' || substr(bsl."id", 1, 8),
  bsl."stoneType" || ' ' || bsl."sizeLabel",
  'CZ'::"StoneCategory",
  'Synthetic'::"StoneOriginType",
  bsl."stoneType",
  'Round'::"StoneShape",
  bsl."sizeLabel",
  'Mixed',
  'Pcs'::"StoneUOM",
  true,
  'Migration',
  NOW()
FROM "BulkStoneLot" bsl
JOIN "Branch" b ON b."id" = bsl."branchId"
WHERE NOT EXISTS (
  SELECT 1 FROM "StoneMaster" sm
  WHERE sm."organizationId" = b."organizationId"
    AND sm."stoneCode" = 'BS-' || substr(bsl."id", 1, 8)
);

-- 2. Create a StoneLot purchase receipt for every remaining BulkStoneLot.
INSERT INTO "StoneLot" (
  "id", "branchId", "stoneMasterId", "lotNo", "vendorName", "invoiceNo", "invoiceDate",
  "qtyPurchased", "weightPurchased", "purchaseRate", "amount", "gstPct", "gstAmount", "totalAmount",
  "currentQty", "currentWeightCt", "location", "status", "createdByName", "updatedAt"
)
SELECT
  gen_random_uuid()::text,
  bsl."branchId",
  sm."id",
  COALESCE(bsl."lotReference", 'LOT-MIG-' || substr(bsl."id", 1, 8)),
  COALESCE(bsl."vendor", 'Unknown'),
  'MIGRATED',
  COALESCE(bsl."purchaseDate", bsl."createdAt"),
  bsl."quantity",
  0,
  bsl."pricePerStone",
  bsl."pricePerStone" * bsl."quantity",
  0,
  0,
  bsl."pricePerStone" * bsl."quantity",
  bsl."quantity",
  0,
  bsl."location",
  CASE WHEN bsl."quantity" > 0 THEN 'Active'::"StonePurchaseLotStatus" ELSE 'Depleted'::"StonePurchaseLotStatus" END,
  'Migration',
  NOW()
FROM "BulkStoneLot" bsl
JOIN "Branch" br ON br."id" = bsl."branchId"
JOIN "StoneMaster" sm ON sm."organizationId" = br."organizationId"
  AND sm."stoneCode" = 'BS-' || substr(bsl."id", 1, 8)
WHERE NOT EXISTS (
  SELECT 1 FROM "StoneLot" sl
  WHERE sl."stoneMasterId" = sm."id"
    AND sl."invoiceNo" = 'MIGRATED'
    AND sl."lotNo" = COALESCE(bsl."lotReference", 'LOT-MIG-' || substr(bsl."id", 1, 8))
);

-- 3. Receipt movements for any migrated lots that don't have one yet.
INSERT INTO "StoneMovement" (
  "id", "branchId", "stoneLotId", "movementType", "qty", "weightCt",
  "balanceQtyAfter", "balanceWeightAfter", "ratePerUnit", "totalValue",
  "reason", "performedByName", "createdAt"
)
SELECT
  gen_random_uuid()::text,
  sl."branchId",
  sl."id",
  'Receipt'::"StoneMovementType",
  sl."qtyPurchased",
  sl."weightPurchased",
  sl."currentQty",
  sl."currentWeightCt",
  sl."purchaseRate",
  sl."amount",
  'Migrated from BulkStoneLot',
  'Migration',
  sl."createdAt"
FROM "StoneLot" sl
WHERE sl."invoiceNo" = 'MIGRATED'
  AND NOT EXISTS (
    SELECT 1 FROM "StoneMovement" mv
    WHERE mv."stoneLotId" = sl."id"
      AND mv."movementType" = 'Receipt'::"StoneMovementType"
  );

-- 4. Drop the deprecated BulkStoneLot table.
DROP TABLE "BulkStoneLot";
