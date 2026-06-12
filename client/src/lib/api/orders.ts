import type { NewOrderInput, Order, UpdateOrderInput } from "@/lib/types";
import { api } from "./client";

export const fetchOrders = async (): Promise<Order[]> => {
  const { data } = await api.get<Order[]>("/api/orders");
  return data;
};

export const createOrder = async (input: NewOrderInput): Promise<Order> => {
  const { data } = await api.post<Order>("/api/orders", input);
  return data;
};

export const updateOrder = async (
  id: string,
  input: UpdateOrderInput,
): Promise<Order> => {
  const { data } = await api.patch<Order>(`/api/orders/${id}`, input);
  return data;
};
