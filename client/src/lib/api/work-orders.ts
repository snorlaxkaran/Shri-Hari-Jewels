import type {
  NewWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrder,
} from "@/lib/types";
import { api } from "./client";

export const fetchWorkOrders = async (): Promise<WorkOrder[]> => {
  const { data } = await api.get<WorkOrder[]>("/api/work-orders");
  return data;
};

export const createWorkOrder = async (
  input: NewWorkOrderInput,
): Promise<WorkOrder> => {
  const { data } = await api.post<WorkOrder>("/api/work-orders", input);
  return data;
};

export const updateWorkOrder = async (
  id: string,
  input: UpdateWorkOrderInput,
): Promise<WorkOrder> => {
  const { data } = await api.patch<WorkOrder>(`/api/work-orders/${id}`, input);
  return data;
};
