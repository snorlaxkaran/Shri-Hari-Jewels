import { prisma } from "../db.js";

export const generateRepairNo = async (organizationId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `RO-${year}-`;

  const existing = await prisma.repairOrder.findMany({
    select: { repairNo: true },
    where: {
      organizationId,
      repairNo: { startsWith: prefix },
    },
  });

  const sequences = existing
    .map((item) => parseInt(item.repairNo.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
};
