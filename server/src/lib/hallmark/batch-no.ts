import { prisma } from "../db.js";

export const generateHallmarkBatchNo = async (
  organizationId: string,
): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `HM-${year}-`;

  const existing = await prisma.hallmarkBatch.findMany({
    where: { organizationId, batchNo: { startsWith: prefix } },
    select: { batchNo: true },
  });

  const sequences = existing
    .map((row) => parseInt(row.batchNo.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
};
