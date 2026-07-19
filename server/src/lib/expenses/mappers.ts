import type {
  Expense as PrismaExpense,
  ExpenseCategory as DbExpenseCategory,
  ExpenseStatus as DbExpenseStatus,
} from "@prisma/client";
import type {
  Expense,
  ExpenseCategory,
  ExpenseStatus,
} from "../../types.js";
import { moneyToNumber } from "../money.js";

const DB_TO_API_CATEGORY: Record<DbExpenseCategory, ExpenseCategory> = {
  Tools: "Tools",
  Pantry: "Pantry",
  Stationery: "Stationery",
  Maintenance: "Maintenance",
  Transport: "Transport",
  Miscellaneous: "Miscellaneous",
};

export const toApiExpenseCategory = (category: DbExpenseCategory): ExpenseCategory =>
  DB_TO_API_CATEGORY[category];

export const toDbExpenseCategory = (category: ExpenseCategory): DbExpenseCategory => {
  const map: Record<ExpenseCategory, DbExpenseCategory> = {
    Tools: "Tools",
    Pantry: "Pantry",
    Stationery: "Stationery",
    Maintenance: "Maintenance",
    Transport: "Transport",
    Miscellaneous: "Miscellaneous",
  };
  return map[category];
};

const DB_TO_API_STATUS: Record<DbExpenseStatus, ExpenseStatus> = {
  Requested: "Requested",
  Approved: "Approved",
  Disbursed: "Disbursed",
  ReceiptPending: "Receipt Pending",
  Settled: "Settled",
  Rejected: "Rejected",
};

export const toApiExpenseStatus = (status: DbExpenseStatus): ExpenseStatus =>
  DB_TO_API_STATUS[status];

export const toDbExpenseStatus = (status: ExpenseStatus): DbExpenseStatus => {
  const map: Record<ExpenseStatus, DbExpenseStatus> = {
    Requested: "Requested",
    Approved: "Approved",
    Disbursed: "Disbursed",
    "Receipt Pending": "ReceiptPending",
    Settled: "Settled",
    Rejected: "Rejected",
  };
  return map[status];
};

export const computeAmountVarianceNote = (
  requestedAmount: number | undefined,
  actualAmount: number | undefined,
): string | undefined => {
  if (requestedAmount == null || actualAmount == null || requestedAmount <= 0) {
    return undefined;
  }
  const variancePct = Math.abs(actualAmount - requestedAmount) / requestedAmount * 100;
  if (variancePct <= 20) return undefined;
  return `Actual amount (${actualAmount.toFixed(2)}) differs from estimate (${requestedAmount.toFixed(2)}) by ${variancePct.toFixed(0)}%.`;
};

export const toExpense = (row: PrismaExpense): Expense => ({
  id: row.id,
  organizationId: row.organizationId,
  branchId: row.branchId,
  voucherNo: row.voucherNo,
  category: toApiExpenseCategory(row.category),
  description: row.description,
  requestedAmount:
    row.requestedAmount != null ? moneyToNumber(row.requestedAmount) : undefined,
  actualAmount: row.actualAmount != null ? moneyToNumber(row.actualAmount) : undefined,
  status: toApiExpenseStatus(row.status),
  requestedByName: row.requestedByName,
  approvedByName: row.approvedByName ?? undefined,
  disbursedByName: row.disbursedByName ?? undefined,
  vendorName: row.vendorName ?? undefined,
  receiptUrl: row.receiptUrl ?? undefined,
  rejectionReason: row.rejectionReason ?? undefined,
  requestedAt: row.requestedAt.toISOString(),
  approvedAt: row.approvedAt?.toISOString(),
  disbursedAt: row.disbursedAt?.toISOString(),
  settledAt: row.settledAt?.toISOString(),
  amountVarianceNote: computeAmountVarianceNote(
    row.requestedAmount != null ? moneyToNumber(row.requestedAmount) : undefined,
    row.actualAmount != null ? moneyToNumber(row.actualAmount) : undefined,
  ),
});
