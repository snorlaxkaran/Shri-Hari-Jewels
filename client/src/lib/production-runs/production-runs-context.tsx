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
  NewProductionRunInput,
  ProductionRun,
  UpdateProductionRunInput,
  UpdateProductionRunItemInput,
} from "@/lib/types";
import {
  createProductionRun as createProductionRunApi,
  deleteProductionRun as deleteProductionRunApi,
  fetchProductionRuns,
  updateProductionRun as updateProductionRunApi,
  updateProductionRunItem as updateProductionRunItemApi,
} from "@/lib/api/production-runs";

type ProductionRunsContextValue = {
  productionRuns: ProductionRun[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addProductionRun: (input: NewProductionRunInput) => Promise<ProductionRun>;
  patchProductionRun: (
    id: string,
    input: UpdateProductionRunInput,
  ) => Promise<ProductionRun>;
  patchProductionRunItem: (
    runId: string,
    itemId: string,
    input: UpdateProductionRunItemInput,
  ) => Promise<ProductionRun>;
  removeProductionRun: (id: string) => Promise<void>;
};

const ProductionRunsContext =
  createContext<ProductionRunsContextValue | null>(null);

export function ProductionRunsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [productionRuns, setProductionRuns] = useState<ProductionRun[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchProductionRuns();
      setProductionRuns(data);
    } catch {
      setError("Could not load production runs. Is the backend running?");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addProductionRun = useCallback(async (input: NewProductionRunInput) => {
    const run = await createProductionRunApi(input);
    setProductionRuns((prev) => [run, ...prev]);
    return run;
  }, []);

  const patchProductionRun = useCallback(
    async (id: string, input: UpdateProductionRunInput) => {
      const run = await updateProductionRunApi(id, input);
      setProductionRuns((prev) =>
        prev.map((r) => (r.id === run.id ? run : r)),
      );
      return run;
    },
    [],
  );

  const patchProductionRunItem = useCallback(
    async (
      runId: string,
      itemId: string,
      input: UpdateProductionRunItemInput,
    ) => {
      const run = await updateProductionRunItemApi(runId, itemId, input);
      setProductionRuns((prev) =>
        prev.map((r) => (r.id === run.id ? run : r)),
      );
      return run;
    },
    [],
  );

  const removeProductionRun = useCallback(async (id: string) => {
    await deleteProductionRunApi(id);
    setProductionRuns((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const value = useMemo(
    () => ({
      productionRuns,
      hydrated,
      loading,
      error,
      refresh,
      addProductionRun,
      patchProductionRun,
      patchProductionRunItem,
      removeProductionRun,
    }),
    [
      productionRuns,
      hydrated,
      loading,
      error,
      refresh,
      addProductionRun,
      patchProductionRun,
      patchProductionRunItem,
      removeProductionRun,
    ],
  );

  return (
    <ProductionRunsContext.Provider value={value}>
      {children}
    </ProductionRunsContext.Provider>
  );
}

export const useProductionRuns = () => {
  const ctx = useContext(ProductionRunsContext);
  if (!ctx) {
    throw new Error(
      "useProductionRuns must be used within ProductionRunsProvider",
    );
  }
  return ctx;
};
