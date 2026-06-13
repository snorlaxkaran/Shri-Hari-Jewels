import { prisma } from "../db.js";

export const generateWorkOrderNo = async (): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `WO-${year}-`;

  const existing = await prisma.workOrder.findMany({
    select: { workOrderNo: true },
    where: {
      workOrderNo: {
        startsWith: prefix,
      },
    },
  });

  const sequences = existing
    .map((item) => parseInt(item.workOrderNo.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
};
