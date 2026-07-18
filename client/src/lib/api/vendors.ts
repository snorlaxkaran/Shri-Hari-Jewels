import { api } from "./client";
import type { NewVendorInput, UpdateVendorInput, Vendor } from "@/lib/types";

export const fetchVendors = async (): Promise<Vendor[]> => {
  const { data } = await api.get<Vendor[]>("/api/vendors");
  return data;
};

export const createVendor = async (input: NewVendorInput): Promise<Vendor> => {
  const { data } = await api.post<Vendor>("/api/vendors", input);
  return data;
};

export const updateVendor = async (
  id: string,
  input: UpdateVendorInput,
): Promise<Vendor> => {
  const { data } = await api.patch<Vendor>(`/api/vendors/${id}`, input);
  return data;
};
