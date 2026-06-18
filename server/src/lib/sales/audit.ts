import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";

type TransactionClient = Prisma.TransactionClient;

export type SaleAuditInput = {
  saleId?: string;
  invoiceId?: string;
  action: string;
  previousValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  reason?: string;
  performedById?: string;
  performedByName: string;
};

const writeLog = async (
  client: TransactionClient | typeof prisma,
  input: SaleAuditInput,
) => {
  await client.saleAuditLog.create({
    data: {
      saleId: input.saleId,
      invoiceId: input.invoiceId,
      action: input.action,
      previousValue: input.previousValue
        ? JSON.stringify(input.previousValue)
        : null,
      newValue: input.newValue ? JSON.stringify(input.newValue) : null,
      reason: input.reason,
      performedById: input.performedById,
      performedByName: input.performedByName,
    },
  });
};

export const recordSaleAudit = async (input: SaleAuditInput) => {
  await writeLog(prisma, input);
};

export const recordSaleAuditInTx = async (
  tx: TransactionClient,
  input: SaleAuditInput,
) => {
  await writeLog(tx, input);
};
