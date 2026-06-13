"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  NewWorkOrderInput,
  UpdateWorkOrderInput,
  WorkOrder,
} from "@/lib/types";
import {
  createWorkOrder as createWorkOrderApi,
  fetchWorkOrders,
  updateWorkOrder as updateWorkOrderApi,
} from "@/lib/api/work-orders";

type WorkOrdersContextValue = {
  workOrders: WorkOrder[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addWorkOrder: (input: NewWorkOrderInput) => Promise<WorkOrder>;
  patchWorkOrder: (
    id: string,
    input: UpdateWorkOrderInput,
  ) => Promise<WorkOrder>;
};

const WorkOrdersContext = createContext<WorkOrdersContextValue | null>(null);

export function WorkOrdersProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchWorkOrders();
      setWorkOrders(data);
    } catch {
      setError("Could not load work orders. Is the backend running?");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addWorkOrder = useCallback(async (input: NewWorkOrderInput) => {
    const workOrder = await createWorkOrderApi(input);
    setWorkOrders((prev) => [workOrder, ...prev]);
    return workOrder;
  }, []);

  const patchWorkOrder = useCallback(
    async (id: string, input: UpdateWorkOrderInput) => {
      const workOrder = await updateWorkOrderApi(id, input);
      setWorkOrders((prev) =>
        prev.map((w) => (w.id === workOrder.id ? workOrder : w)),
      );
      return workOrder;
    },
    [],
  );

  const value = useMemo(
    () => ({
      workOrders,
      hydrated,
      loading,
      error,
      refresh,
      addWorkOrder,
      patchWorkOrder,
    }),
    [
      workOrders,
      hydrated,
      loading,
      error,
      refresh,
      addWorkOrder,
      patchWorkOrder,
    ],
  );

  return (
    <WorkOrdersContext.Provider value={value}>
      {children}
    </WorkOrdersContext.Provider>
  );
}

export const useWorkOrders = () => {
  const ctx = useContext(WorkOrdersContext);
  if (!ctx) {
    throw new Error("useWorkOrders must be used within WorkOrdersProvider");
  }
  return ctx;
};
