import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const backfillSql = `
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
  AND u."branchTransferredAt" IS NULL
  AND (
    u."branchId" = latest."toBranchId"
    OR (u."status" = 'InTransit' AND latest.status = 'Pending')
  );
`;

try {
  const updated = await prisma.$executeRawUnsafe(backfillSql);
  console.log(`Backfilled branchTransferredAt for ${updated} unit(s).`);

  const units = await prisma.inventoryUnit.findMany({
    where: { branch: { name: { contains: "Jaipur", mode: "insensitive" } } },
    select: {
      itemCode: true,
      branchTransferredAt: true,
      createdAt: true,
      branch: { select: { name: true } },
    },
    take: 5,
    orderBy: { createdAt: "desc" },
  });
  console.log("Jaipur units after backfill:", JSON.stringify(units, null, 2));
} finally {
  await prisma.$disconnect();
}
