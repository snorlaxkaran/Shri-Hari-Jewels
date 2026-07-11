-- Track when HO transferred each unit to its current branch (for branch-level ageing).
ALTER TABLE "InventoryUnit" ADD COLUMN "branchTransferredAt" TIMESTAMP(3);

-- Backfill from the latest HO-to-branch stock transfer per item.
UPDATE "InventoryUnit" AS u
SET "branchTransferredAt" = latest."transferDate"
FROM (
  SELECT DISTINCT ON (sti."itemCode")
    sti."itemCode",
    st."transferDate",
    st."toBranchId",
    st.status
  FROM "StockTransferItem" sti
  INNER JOIN "StockTransfer" st ON st.id = sti."transferId"
  WHERE st.status IN ('Pending', 'Accepted', 'PartiallyAccepted')
    AND sti.accepted = true
  ORDER BY sti."itemCode", st."transferDate" DESC
) AS latest
WHERE u."itemCode" = latest."itemCode"
  AND (
    u."branchId" = latest."toBranchId"
    OR (u."status" = 'InTransit' AND latest.status = 'Pending')
  );
