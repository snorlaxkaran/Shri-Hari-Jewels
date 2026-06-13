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
  InventoryItem,
  NewProductInput,
  UpdateProductInput,
} from "@/lib/types";
import {
  addProductUnits,
  createProduct,
  deleteInventoryUnit as deleteInventoryUnitApi,
  deleteProduct as deleteProductApi,
  fetchInventory,
  updateProduct as updateProductApi,
} from "@/lib/api/inventory";

type InventoryContextValue = {
  items: InventoryItem[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addProduct: (input: NewProductInput) => Promise<InventoryItem>;
  updateProduct: (
    id: string,
    input: UpdateProductInput,
  ) => Promise<InventoryItem>;
  deleteProduct: (id: string) => Promise<void>;
  removeUnit: (unitId: string) => Promise<InventoryItem>;
  addQuantityToSku: (sku: string, quantity: number) => Promise<InventoryItem | null>;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchInventory();
      setItems(data);
    } catch {
      setError("Could not connect to the server. Is the backend running?");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addProduct = useCallback(async (input: NewProductInput) => {
    const product = await createProduct(input);
    setItems((prev) => [product, ...prev]);
    return product;
  }, []);

  const updateProduct = useCallback(async (id: string, input: UpdateProductInput) => {
    const updated = await updateProductApi(id, input);
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  const deleteProduct = useCallback(async (id: string) => {
    await deleteProductApi(id);
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const removeUnit = useCallback(async (unitId: string) => {
    const updated = await deleteInventoryUnitApi(unitId);
    setItems((prev) =>
      prev.map((item) => (item.id === updated.id ? updated : item)),
    );
    return updated;
  }, []);

  const addQuantityToSku = useCallback(
    async (sku: string, quantity: number) => {
      const existing = items.find((i) => i.sku === sku);
      if (!existing) return null;

      const updated = await addProductUnits(existing.id, quantity);
      setItems((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );
      return updated;
    },
    [items],
  );

  const value = useMemo(
    () => ({
      items,
      hydrated,
      loading,
      error,
      refresh,
      addProduct,
      updateProduct,
      deleteProduct,
      removeUnit,
      addQuantityToSku,
    }),
    [
      items,
      hydrated,
      loading,
      error,
      refresh,
      addProduct,
      updateProduct,
      deleteProduct,
      removeUnit,
      addQuantityToSku,
    ],
  );

  return (
    <InventoryContext.Provider value={value}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) {
    throw new Error("useInventory must be used within InventoryProvider");
  }
  return ctx;
};
