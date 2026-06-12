"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { NewOrderInput, Order, UpdateOrderInput } from "@/lib/types";
import {
  createOrder as createOrderApi,
  fetchOrders,
  updateOrder as updateOrderApi,
} from "@/lib/api/orders";

type OrdersContextValue = {
  orders: Order[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addOrder: (input: NewOrderInput) => Promise<Order>;
  patchOrder: (id: string, input: UpdateOrderInput) => Promise<Order>;
};

const OrdersContext = createContext<OrdersContextValue | null>(null);

export function OrdersProvider({ children }: { children: React.ReactNode }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchOrders();
      setOrders(data);
    } catch {
      setError("Could not load orders. Is the backend running?");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addOrder = useCallback(async (input: NewOrderInput) => {
    const order = await createOrderApi(input);
    setOrders((prev) => [order, ...prev]);
    return order;
  }, []);

  const patchOrder = useCallback(async (id: string, input: UpdateOrderInput) => {
    const order = await updateOrderApi(id, input);
    setOrders((prev) => prev.map((o) => (o.id === order.id ? order : o)));
    return order;
  }, []);

  const value = useMemo(
    () => ({
      orders,
      hydrated,
      loading,
      error,
      refresh,
      addOrder,
      patchOrder,
    }),
    [orders, hydrated, loading, error, refresh, addOrder, patchOrder],
  );

  return (
    <OrdersContext.Provider value={value}>{children}</OrdersContext.Provider>
  );
}

export const useOrders = () => {
  const ctx = useContext(OrdersContext);
  if (!ctx) {
    throw new Error("useOrders must be used within OrdersProvider");
  }
  return ctx;
};
