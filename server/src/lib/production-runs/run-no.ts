import { prisma } from "../db.js";

export const generateProductionRunNo = async (
  organizationId: string,
): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `PR-${year}-`;

  const existing = await prisma.productionRun.findMany({
    select: { runNo: true },
    where: { organizationId, runNo: { startsWith: prefix } },
  });

  const sequences = existing
    .map((item) => parseInt(item.runNo.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
};
