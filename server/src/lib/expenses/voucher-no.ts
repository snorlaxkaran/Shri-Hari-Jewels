import { prisma } from "../db.js";

export const generateVoucherNo = async (organizationId: string): Promise<string> => {
  const year = new Date().getFullYear();
  const prefix = `EXP-${year}-`;

  const existing = await prisma.expense.findMany({
    select: { voucherNo: true },
    where: {
      organizationId,
      voucherNo: { startsWith: prefix },
    },
  });

  const sequences = existing
    .map((item) => parseInt(item.voucherNo.slice(prefix.length), 10))
    .filter((n) => !Number.isNaN(n));

  const next = sequences.length > 0 ? Math.max(...sequences) + 1 : 1;
  return `${prefix}${String(next).padStart(4, "0")}`;
};
