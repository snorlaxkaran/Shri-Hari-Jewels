import type {
  Employee,
  NewEmployeeInput,
  UpdateEmployeeInput,
} from "@/lib/types";
import { api } from "./client";

export const fetchEmployees = async (branchId?: string): Promise<Employee[]> => {
  const { data } = await api.get<Employee[]>("/api/employees", {
    params: branchId ? { branchId } : undefined,
  });
  return data;
};

export const fetchMyEmployeeRecord = async (): Promise<Employee | null> => {
  const { data } = await api.get<Employee | null>("/api/employees/me");
  return data;
};

export const createEmployee = async (
  input: NewEmployeeInput,
): Promise<Employee> => {
  const { data } = await api.post<Employee>("/api/employees", input);
  return data;
};

export const updateEmployee = async (
  id: string,
  input: UpdateEmployeeInput,
): Promise<Employee> => {
  const { data } = await api.patch<Employee>(`/api/employees/${id}`, input);
  return data;
};
