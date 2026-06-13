import type {
  InventoryItem,
  NewProductInput,
  UpdateProductInput,
} from "@/lib/types";
import { api } from "./client";

export const fetchInventory = async (): Promise<InventoryItem[]> => {
  const { data } = await api.get<InventoryItem[]>("/api/inventory");
  return data;
};

export const createProduct = async (
  input: NewProductInput,
): Promise<InventoryItem> => {
  const { data } = await api.post<InventoryItem>("/api/inventory", input);
  return data;
};

export const addProductUnits = async (
  productId: string,
  quantity: number,
): Promise<InventoryItem> => {
  const { data } = await api.post<InventoryItem>(
    `/api/inventory/${productId}/units`,
    { quantity },
  );
  return data;
};

export const updateProduct = async (
  productId: string,
  input: UpdateProductInput,
): Promise<InventoryItem> => {
  const { data } = await api.patch<InventoryItem>(
    `/api/inventory/${productId}`,
    input,
  );
  return data;
};

export const deleteProduct = async (productId: string): Promise<void> => {
  await api.delete(`/api/inventory/${productId}`);
};

export const deleteInventoryUnit = async (
  unitId: string,
): Promise<InventoryItem> => {
  const { data } = await api.delete<InventoryItem>(
    `/api/inventory/units/${unitId}`,
  );
  return data;
};
