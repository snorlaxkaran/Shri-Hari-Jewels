import type {
  PayrollRun,
  PayrollAttendancePreview,
  PayslipItem,
} from "@/lib/types";
import { api } from "./client";

export const fetchPayrollRuns = async (
  branchId?: string,
): Promise<PayrollRun[]> => {
  const { data } = await api.get<PayrollRun[]>("/api/payroll-runs", {
    params: branchId ? { branchId } : undefined,
  });
  return data;
};

export const fetchPayrollRun = async (id: string): Promise<PayrollRun> => {
  const { data } = await api.get<PayrollRun>(`/api/payroll-runs/${id}`);
  return data;
};

export const fetchPayrollAttendancePreview = async (params: {
  month: number;
  year: number;
  branchId: string;
}): Promise<PayrollAttendancePreview[]> => {
  const { data } = await api.get<PayrollAttendancePreview[]>(
    "/api/payroll-runs/preview-attendance",
    { params },
  );
  return data;
};

export const createPayrollRun = async (input: {
  month: number;
  year: number;
  branchId: string;
}): Promise<PayrollRun> => {
  const { data } = await api.post<PayrollRun>("/api/payroll-runs", input);
  return data;
};

export const updatePayslipItem = async (
  runId: string,
  itemId: string,
  input: Partial<PayslipItem>,
): Promise<PayrollRun> => {
  const { data } = await api.patch<PayrollRun>(
    `/api/payroll-runs/${runId}/items/${itemId}`,
    input,
  );
  return data;
};

export const finalizePayrollRun = async (id: string): Promise<PayrollRun> => {
  const { data } = await api.post<PayrollRun>(
    `/api/payroll-runs/${id}/finalize`,
  );
  return data;
};

export const markPayrollRunPaid = async (id: string): Promise<PayrollRun> => {
  const { data } = await api.post<PayrollRun>(
    `/api/payroll-runs/${id}/mark-paid`,
  );
  return data;
};

export const downloadPayslipPdf = async (
  runId: string,
  itemId: string,
): Promise<Blob> => {
  const { data } = await api.get<Blob>(
    `/api/payroll-runs/${runId}/items/${itemId}/pdf`,
    { responseType: "blob" },
  );
  return data;
};

export const emailPayslip = async (
  runId: string,
  itemId: string,
  to: string,
): Promise<void> => {
  await api.post(
    `/api/payroll-runs/${runId}/items/${itemId}/email-payslip`,
    { to },
  );
};
