import { api } from "./client";
import type {
  ApproveRepairInput,
  DeliverRepairInput,
  EstimateRepairInput,
  NewRepairOrderInput,
  RejectRepairInput,
  RepairOrder,
  RepairStatus,
  UpdateRepairStatusInput,
} from "@/lib/types";

export const fetchRepairs = async (params?: {
  status?: RepairStatus;
  search?: string;
}): Promise<RepairOrder[]> => {
  const { data } = await api.get<RepairOrder[]>("/api/repairs", { params });
  return data;
};

export const fetchRepairById = async (id: string): Promise<RepairOrder> => {
  const { data } = await api.get<RepairOrder>(`/api/repairs/${id}`);
  return data;
};

export const fetchReadyForPickupCount = async (): Promise<number> => {
  const { data } = await api.get<{ count: number }>(
    "/api/repairs/ready-for-pickup-count",
  );
  return data.count;
};

export const createRepair = async (
  input: NewRepairOrderInput,
): Promise<RepairOrder> => {
  const { data } = await api.post<RepairOrder>("/api/repairs", input);
  return data;
};

export const setRepairEstimate = async (
  id: string,
  input: EstimateRepairInput,
): Promise<RepairOrder> => {
  const { data } = await api.patch<RepairOrder>(
    `/api/repairs/${id}/estimate`,
    input,
  );
  return data;
};

export const sendRepairForApproval = async (id: string): Promise<RepairOrder> => {
  const { data } = await api.post<RepairOrder>(
    `/api/repairs/${id}/send-for-approval`,
  );
  return data;
};

export const approveRepair = async (
  id: string,
  input: ApproveRepairInput,
): Promise<RepairOrder> => {
  const { data } = await api.post<RepairOrder>(`/api/repairs/${id}/approve`, input);
  return data;
};

export const rejectRepair = async (
  id: string,
  input: RejectRepairInput,
): Promise<RepairOrder> => {
  const { data } = await api.post<RepairOrder>(`/api/repairs/${id}/reject`, input);
  return data;
};

export const updateRepairStatus = async (
  id: string,
  input: UpdateRepairStatusInput,
): Promise<RepairOrder> => {
  const { data } = await api.patch<RepairOrder>(`/api/repairs/${id}/status`, input);
  return data;
};

export const deliverRepair = async (
  id: string,
  input: DeliverRepairInput,
): Promise<RepairOrder> => {
  const { data } = await api.post<RepairOrder>(`/api/repairs/${id}/deliver`, input);
  return data;
};

export const createRepairRedo = async (id: string): Promise<RepairOrder> => {
  const { data } = await api.post<RepairOrder>(`/api/repairs/${id}/redo`);
  return data;
};
