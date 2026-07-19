import { api } from "./client";
import type {
  AttachExpenseReceiptInput,
  DirectExpenseInput,
  Expense,
  ExpenseCategory,
  ExpenseReports,
  ExpenseStatus,
  NewExpenseInput,
  PettyCashFloatView,
  RejectExpenseInput,
  SetupPettyCashFloatInput,
} from "@/lib/types";

export const fetchExpensesPendingCount = async (): Promise<number> => {
  const { data } = await api.get<{ count: number }>("/api/expenses/pending-count");
  return data.count;
};

export const fetchExpenses = async (params?: {
  status?: ExpenseStatus;
  category?: ExpenseCategory;
  requestedByName?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}): Promise<Expense[]> => {
  const { data } = await api.get<Expense[]>("/api/expenses", { params });
  return data;
};

export const fetchExpenseReports = async (): Promise<ExpenseReports> => {
  const { data } = await api.get<ExpenseReports>("/api/expenses/reports");
  return data;
};

export const createExpense = async (input: NewExpenseInput): Promise<Expense> => {
  const { data } = await api.post<Expense>("/api/expenses", input);
  return data;
};

export const createDirectExpense = async (input: DirectExpenseInput): Promise<Expense> => {
  const { data } = await api.post<Expense>("/api/expenses/direct", input);
  return data;
};

export const approveExpense = async (id: string): Promise<Expense> => {
  const { data } = await api.post<Expense>(`/api/expenses/${id}/approve`);
  return data;
};

export const rejectExpense = async (
  id: string,
  input: RejectExpenseInput,
): Promise<Expense> => {
  const { data } = await api.post<Expense>(`/api/expenses/${id}/reject`, input);
  return data;
};

export const disburseExpense = async (id: string): Promise<Expense> => {
  const { data } = await api.post<Expense>(`/api/expenses/${id}/disburse`);
  return data;
};

export const attachExpenseReceipt = async (
  id: string,
  input: AttachExpenseReceiptInput,
): Promise<Expense> => {
  const { data } = await api.post<Expense>(`/api/expenses/${id}/receipt`, input);
  return data;
};

export const fetchPettyCashFloat = async (): Promise<PettyCashFloatView | null> => {
  const { data } = await api.get<PettyCashFloatView | null>("/api/petty-cash-float");
  return data;
};

export const setupPettyCashFloat = async (
  input: SetupPettyCashFloatInput,
): Promise<PettyCashFloatView> => {
  const { data } = await api.post<PettyCashFloatView>("/api/petty-cash-float", input);
  return data;
};

export const replenishPettyCashFloat = async (): Promise<PettyCashFloatView> => {
  const { data } = await api.post<PettyCashFloatView>("/api/petty-cash-float/replenish");
  return data;
};
