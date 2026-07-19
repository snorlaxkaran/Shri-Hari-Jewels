import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { writeAuditLog, writeAuditLogInTx } from "../audit/service.js";
import { toMoney, moneyToNumber } from "../money.js";
import type {
  AttachExpenseReceiptInput,
  DirectExpenseInput,
  Expense,
  ExpenseCategory,
  ExpenseMonthlyReport,
  ExpenseRequesterReport,
  ExpenseStatus,
  NewExpenseInput,
  PettyCashFloatView,
  RejectExpenseInput,
  SetupPettyCashFloatInput,
} from "../../types.js";
import {
  toDbExpenseCategory,
  toDbExpenseStatus,
  toExpense,
} from "./mappers.js";
import { generateVoucherNo } from "./voucher-no.js";

export class ExpenseError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "ExpenseError";
  }
}

export type ListExpensesQuery = {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  branchId?: string;
  requestedByName?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
};

const getExpenseOrThrow = async (id: string, organizationId: string) => {
  const row = await prisma.expense.findFirst({
    where: { id, organizationId },
  });
  if (!row) throw new ExpenseError("Expense not found.", 404);
  return row;
};

const getFloatOrThrow = async (organizationId: string, branchId: string) => {
  const row = await prisma.pettyCashFloat.findUnique({
    where: {
      organizationId_branchId: { organizationId, branchId },
    },
  });
  if (!row) {
    throw new ExpenseError(
      "Petty cash float is not set up for this branch. Ask admin to configure it first.",
      400,
    );
  }
  return row;
};

const isLowBalance = (
  currentBalance: Prisma.Decimal,
  floatAmount: Prisma.Decimal,
  thresholdPct: Prisma.Decimal,
): boolean => {
  const balance = moneyToNumber(currentBalance);
  const float = moneyToNumber(floatAmount);
  const threshold = moneyToNumber(thresholdPct);
  if (float <= 0) return false;
  return balance / float * 100 < threshold;
};

export const toPettyCashFloatView = (
  row: {
    id: string;
    organizationId: string;
    branchId: string;
    floatAmount: Prisma.Decimal;
    currentBalance: Prisma.Decimal;
    custodianName: string;
    lowBalanceThresholdPct: Prisma.Decimal;
    lastReplenishedAt: Date | null;
    updatedAt: Date;
  },
): PettyCashFloatView => ({
  id: row.id,
  organizationId: row.organizationId,
  branchId: row.branchId,
  floatAmount: moneyToNumber(row.floatAmount),
  currentBalance: moneyToNumber(row.currentBalance),
  custodianName: row.custodianName,
  lowBalanceThresholdPct: moneyToNumber(row.lowBalanceThresholdPct),
  lastReplenishedAt: row.lastReplenishedAt?.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
  lowBalanceWarning: isLowBalance(
    row.currentBalance,
    row.floatAmount,
    row.lowBalanceThresholdPct,
  ),
});

export const getPettyCashFloat = async (
  organizationId: string,
  branchId: string,
): Promise<PettyCashFloatView | null> => {
  const row = await prisma.pettyCashFloat.findUnique({
    where: {
      organizationId_branchId: { organizationId, branchId },
    },
  });
  return row ? toPettyCashFloatView(row) : null;
};

export const setupPettyCashFloat = async (
  organizationId: string,
  branchId: string,
  input: SetupPettyCashFloatInput,
  actorName: string,
): Promise<PettyCashFloatView> => {
  const floatAmount = toMoney(input.floatAmount);
  const thresholdPct = toMoney(input.lowBalanceThresholdPct ?? 20);

  const row = await prisma.pettyCashFloat.upsert({
    where: {
      organizationId_branchId: { organizationId, branchId },
    },
    create: {
      organizationId,
      branchId,
      floatAmount,
      currentBalance: floatAmount,
      custodianName: input.custodianName.trim(),
      lowBalanceThresholdPct: thresholdPct,
      lastReplenishedAt: new Date(),
    },
    update: {
      floatAmount,
      custodianName: input.custodianName.trim(),
      lowBalanceThresholdPct: thresholdPct,
    },
  });

  await writeAuditLog({
    organizationId,
    entityType: "PettyCashFloat",
    entityId: row.id,
    action: "Setup",
    after: toPettyCashFloatView(row),
    actor: { name: actorName },
  });

  return toPettyCashFloatView(row);
};

export const listExpenses = async (
  organizationId: string,
  query: ListExpensesQuery = {},
): Promise<Expense[]> => {
  const search = query.search?.trim();
  const fromDate = query.fromDate ? new Date(query.fromDate) : undefined;
  const toDate = query.toDate ? new Date(`${query.toDate}T23:59:59.999`) : undefined;

  const rows = await prisma.expense.findMany({
    where: {
      organizationId,
      ...(query.branchId ? { branchId: query.branchId } : {}),
      ...(query.status ? { status: toDbExpenseStatus(query.status) } : {}),
      ...(query.category ? { category: toDbExpenseCategory(query.category) } : {}),
      ...(query.requestedByName
        ? { requestedByName: { contains: query.requestedByName, mode: "insensitive" } }
        : {}),
      ...(fromDate || toDate
        ? {
            requestedAt: {
              ...(fromDate ? { gte: fromDate } : {}),
              ...(toDate ? { lte: toDate } : {}),
            },
          }
        : {}),
      ...(search
        ? {
            OR: [
              { voucherNo: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { requestedByName: { contains: search, mode: "insensitive" } },
              { vendorName: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { requestedAt: "desc" },
  });

  return rows.map(toExpense);
};

export const countPendingExpenses = async (
  organizationId: string,
  branchId?: string,
): Promise<number> =>
  prisma.expense.count({
    where: {
      organizationId,
      status: "Requested",
      ...(branchId ? { branchId } : {}),
    },
  });

export const createExpenseRequest = async (
  input: NewExpenseInput,
  organizationId: string,
  branchId: string,
  requestedByName: string,
): Promise<Expense> => {
  if (!input.description?.trim()) {
    throw new ExpenseError("Description is required.");
  }

  const voucherNo = await generateVoucherNo(organizationId);

  const row = await prisma.expense.create({
    data: {
      organizationId,
      branchId,
      voucherNo,
      category: toDbExpenseCategory(input.category),
      description: input.description.trim(),
      requestedAmount:
        input.requestedAmount != null ? toMoney(input.requestedAmount) : null,
      requestedByName: input.requestedByName?.trim() || requestedByName,
      status: "Requested",
    },
  });

  return toExpense(row);
};

export const createDirectExpense = async (
  input: DirectExpenseInput,
  organizationId: string,
  branchId: string,
  performedByName: string,
): Promise<Expense> => {
  if (!input.description?.trim()) {
    throw new ExpenseError("Description is required.");
  }

  const amount = input.actualAmount ?? input.requestedAmount;
  if (amount == null || amount <= 0) {
    throw new ExpenseError("Amount is required for direct entry.");
  }

  const voucherNo = await generateVoucherNo(organizationId);
  const now = new Date();

  const row = await prisma.$transaction(async (tx) => {
    const floatRow = await tx.pettyCashFloat.findUnique({
      where: { organizationId_branchId: { organizationId, branchId } },
    });
    if (!floatRow) {
      throw new ExpenseError(
        "Petty cash float is not set up for this branch.",
        400,
      );
    }

    const disburseAmount = toMoney(amount);
    const newBalance = toMoney(moneyToNumber(floatRow.currentBalance)).minus(disburseAmount);
    if (newBalance.isNegative()) {
      throw new ExpenseError("Insufficient petty cash balance.", 400);
    }

    await tx.pettyCashFloat.update({
      where: { id: floatRow.id },
      data: { currentBalance: newBalance },
    });

    const created = await tx.expense.create({
      data: {
        organizationId,
        branchId,
        voucherNo,
        category: toDbExpenseCategory(input.category),
        description: input.description.trim(),
        requestedAmount:
          input.requestedAmount != null ? toMoney(input.requestedAmount) : disburseAmount,
        actualAmount: disburseAmount,
        status: input.receiptUrl ? "Settled" : "Disbursed",
        requestedByName: input.requestedByName?.trim() || performedByName,
        approvedByName: performedByName,
        disbursedByName: performedByName,
        vendorName: input.vendorName?.trim() || null,
        receiptUrl: input.receiptUrl ?? null,
        approvedAt: now,
        disbursedAt: now,
        settledAt: input.receiptUrl ? now : null,
      },
    });

    return created;
  });

  return toExpense(row);
};

export const approveExpense = async (
  id: string,
  organizationId: string,
  approvedByName: string,
): Promise<Expense> => {
  const existing = await getExpenseOrThrow(id, organizationId);
  if (existing.status !== "Requested") {
    throw new ExpenseError("Only requested expenses can be approved.");
  }

  const row = await prisma.expense.update({
    where: { id },
    data: {
      status: "Approved",
      approvedByName,
      approvedAt: new Date(),
    },
  });

  return toExpense(row);
};

export const rejectExpense = async (
  id: string,
  organizationId: string,
  input: RejectExpenseInput,
  approvedByName: string,
): Promise<Expense> => {
  if (!input.rejectionReason?.trim()) {
    throw new ExpenseError("Rejection reason is required.");
  }

  const existing = await getExpenseOrThrow(id, organizationId);
  if (existing.status !== "Requested") {
    throw new ExpenseError("Only requested expenses can be rejected.");
  }

  const row = await prisma.expense.update({
    where: { id },
    data: {
      status: "Rejected",
      approvedByName,
      approvedAt: new Date(),
      rejectionReason: input.rejectionReason.trim(),
    },
  });

  return toExpense(row);
};

export const disburseExpense = async (
  id: string,
  organizationId: string,
  disbursedByName: string,
): Promise<Expense> => {
  const existing = await getExpenseOrThrow(id, organizationId);
  if (existing.status !== "Approved") {
    throw new ExpenseError("Only approved expenses can be disbursed.");
  }

  const amount =
    existing.requestedAmount != null
      ? moneyToNumber(existing.requestedAmount)
      : null;
  if (amount == null || amount <= 0) {
    throw new ExpenseError("Requested amount is required before disbursement.");
  }

  const row = await prisma.$transaction(async (tx) => {
    const floatRow = await tx.pettyCashFloat.findUnique({
      where: {
        organizationId_branchId: {
          organizationId,
          branchId: existing.branchId,
        },
      },
    });
    if (!floatRow) {
      throw new ExpenseError("Petty cash float is not set up for this branch.", 400);
    }

    const disburseAmount = toMoney(amount);
    const newBalance = toMoney(moneyToNumber(floatRow.currentBalance)).minus(disburseAmount);
    if (newBalance.isNegative()) {
      throw new ExpenseError("Insufficient petty cash balance.", 400);
    }

    await tx.pettyCashFloat.update({
      where: { id: floatRow.id },
      data: { currentBalance: newBalance },
    });

    return tx.expense.update({
      where: { id },
      data: {
        status: "Disbursed",
        disbursedByName,
        disbursedAt: new Date(),
      },
    });
  });

  return toExpense(row);
};

export const attachExpenseReceipt = async (
  id: string,
  organizationId: string,
  input: AttachExpenseReceiptInput,
): Promise<Expense> => {
  if (input.actualAmount == null || input.actualAmount <= 0) {
    throw new ExpenseError("Actual amount is required.");
  }

  const existing = await getExpenseOrThrow(id, organizationId);
  if (existing.status !== "Disbursed" && existing.status !== "ReceiptPending") {
    throw new ExpenseError("Receipt can only be attached to disbursed expenses.");
  }

  const row = await prisma.expense.update({
    where: { id },
    data: {
      status: "Settled",
      actualAmount: toMoney(input.actualAmount),
      vendorName: input.vendorName?.trim() || null,
      receiptUrl: input.receiptUrl ?? null,
      settledAt: new Date(),
    },
  });

  return toExpense(row);
};

export const replenishPettyCashFloat = async (
  organizationId: string,
  branchId: string,
  actor: { id?: string; name: string },
): Promise<PettyCashFloatView> => {
  const floatRow = await getFloatOrThrow(organizationId, branchId);
  const before = toPettyCashFloatView(floatRow);

  const row = await prisma.$transaction(async (tx) => {
    const updated = await tx.pettyCashFloat.update({
      where: { id: floatRow.id },
      data: {
        currentBalance: floatRow.floatAmount,
        lastReplenishedAt: new Date(),
      },
    });

    await writeAuditLogInTx(tx, {
      organizationId,
      entityType: "PettyCashFloat",
      entityId: updated.id,
      action: "Replenish",
      before,
      after: toPettyCashFloatView(updated),
      actor,
    });

    return updated;
  });

  return toPettyCashFloatView(row);
};

export const getExpenseReports = async (
  organizationId: string,
  branchId?: string,
): Promise<{
  monthlyByCategory: ExpenseMonthlyReport[];
  byRequester: ExpenseRequesterReport[];
}> => {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const settled = await prisma.expense.findMany({
    where: {
      organizationId,
      status: "Settled",
      settledAt: { gte: monthStart },
      ...(branchId ? { branchId } : {}),
    },
    select: {
      category: true,
      actualAmount: true,
      requestedAmount: true,
      requestedByName: true,
    },
  });

  const categoryTotals = new Map<string, number>();
  const requesterTotals = new Map<string, number>();

  for (const row of settled) {
    const amount = moneyToNumber(row.actualAmount ?? row.requestedAmount ?? 0);
    const category = row.category;
    categoryTotals.set(category, (categoryTotals.get(category) ?? 0) + amount);
    requesterTotals.set(
      row.requestedByName,
      (requesterTotals.get(row.requestedByName) ?? 0) + amount,
    );
  }

  return {
    monthlyByCategory: [...categoryTotals.entries()]
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
    byRequester: [...requesterTotals.entries()]
      .map(([requestedByName, total]) => ({ requestedByName, total }))
      .sort((a, b) => b.total - a.total),
  };
};
