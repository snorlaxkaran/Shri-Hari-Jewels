import type { Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

export const nextEntryVoucherCode = async (
  client: TransactionClient | { entryVoucher: TransactionClient["entryVoucher"] },
  organizationId: string,
): Promise<string> => {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `VCH-${year}-`;

  const latest = await client.entryVoucher.findFirst({
    where: {
      organizationId,
      voucherCode: { startsWith: prefix },
    },
    orderBy: { voucherCode: "desc" },
    select: { voucherCode: true },
  });

  const lastNumber = latest
    ? Number(latest.voucherCode.replace(prefix, "")) || 0
    : 0;

  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
};
