import type { Prisma } from "@prisma/client";

type PrismaTx = Prisma.TransactionClient;

export const generateStoneStockLotNo = async (
  tx: PrismaTx,
  organizationId: string,
): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `LOT-${year}-`;

  const last = await tx.stoneStock.findFirst({
    where: {
      lotNo: { startsWith: prefix },
      branch: { organizationId },
    },
    orderBy: { lotNo: "desc" },
  });

  const next = last
    ? parseInt(last.lotNo.split("-")[2] ?? "0", 10) + 1
    : 1;

  return `${prefix}${String(next).padStart(4, "0")}`;
};
