import { prisma } from "../db.js";
import { toMoney, moneyToNumber } from "../money.js";
import { writeAuditLog } from "../audit/service.js";
import { logBusinessEvent } from "../logger.js";

export class ExchangeError extends Error {
  constructor(message: string, readonly statusCode = 400) {
    super(message);
    this.name = "ExchangeError";
  }
}

export const createExchangeTransaction = async (input: {
  organizationId: string;
  branchId: string;
  customerId?: string;
  description: string;
  metalType: string;
  purity: string;
  grossWeightGrams: number;
  netWeightGrams: number;
  wastagePct?: number;
  ratePerGram: number;
  notes?: string;
  actor: { id?: string; name: string };
}) => {
  const exchangeValue = input.netWeightGrams * input.ratePerGram;
  const row = await prisma.exchangeTransaction.create({
    data: {
      organizationId: input.organizationId,
      branchId: input.branchId,
      customerId: input.customerId,
      description: input.description,
      metalType: input.metalType,
      purity: input.purity,
      grossWeightGrams: toMoney(input.grossWeightGrams),
      netWeightGrams: toMoney(input.netWeightGrams),
      wastagePct: toMoney(input.wastagePct ?? 0),
      ratePerGram: toMoney(input.ratePerGram),
      exchangeValue: toMoney(exchangeValue),
      notes: input.notes,
      createdById: input.actor.id,
      createdByName: input.actor.name,
    },
  });

  logBusinessEvent("exchange.created", { id: row.id, value: exchangeValue });
  return {
    id: row.id,
    exchangeValue,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
  };
};

export const listExchangeTransactions = async (
  organizationId: string,
  branchId?: string,
) => {
  const rows = await prisma.exchangeTransaction.findMany({
    where: {
      organizationId,
      ...(branchId ? { branchId } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    description: r.description,
    metalType: r.metalType,
    purity: r.purity,
    netWeightGrams: moneyToNumber(r.netWeightGrams),
    exchangeValue: moneyToNumber(r.exchangeValue),
    status: r.status,
    createdByName: r.createdByName,
    createdAt: r.createdAt.toISOString(),
  }));
};
