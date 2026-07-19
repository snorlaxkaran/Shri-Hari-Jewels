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
  InventoryUnitStatus,
  NewProductInput,
  UpdateProductInput,
} from "@/lib/types";
import {
  addProductUnits,
  createProduct,
  deleteInventoryUnit as deleteInventoryUnitApi,
  deleteProduct as deleteProductApi,
  fetchInventory,
  transferInventoryUnits as transferInventoryUnitsApi,
  updateProduct as updateProductApi,
} from "@/lib/api/inventory";

const AUTO_REFRESH_MS = 60_000; // keep stock fresh across tabs/devices

const deriveProductStock = (units: InventoryItem["units"]) =>
  units.filter((unit) => unit.status === "Available").length;

const deriveProductStatus = (
  stock: number,
): InventoryItem["status"] => {
  if (stock <= 0) return "Out of Stock";
  if (stock <= 2) return "Low Stock";
  return "In Stock";
};

const patchUnitsStatus = (
  items: InventoryItem[],
  itemCodes: string[],
  status: InventoryUnitStatus,
): InventoryItem[] => {
  const codes = new Set(itemCodes.map((code) => code.trim()).filter(Boolean));
  if (codes.size === 0) return items;

  return items.map((item) => {
    const hasMatch = item.units.some((unit) => codes.has(unit.itemCode));
    if (!hasMatch) return item;

    const units = item.units.map((unit) =>
      codes.has(unit.itemCode) ? { ...unit, status } : unit,
    );
    const stock = deriveProductStock(units);

    return {
      ...item,
      units,
      stock,
      status: deriveProductStatus(stock),
    };
  });
};

type InventoryContextValue = {
  items: InventoryItem[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  refresh: (options?: { silent?: boolean }) => Promise<void>;
  markUnitsSold: (itemCodes: string[]) => void;
  markUnitsReserved: (itemCodes: string[]) => void;
  markUnitsAvailable: (itemCodes: string[]) => void;
  addProduct: (input: NewProductInput) => Promise<InventoryItem>;
  updateProduct: (
    id: string,
    input: UpdateProductInput,
  ) => Promise<InventoryItem>;
  deleteProduct: (id: string) => Promise<void>;
  removeUnit: (unitId: string) => Promise<InventoryItem>;
  addQuantityToSku: (sku: string, quantity: number) => Promise<InventoryItem | null>;
  transferUnits: (
    productId: string,
    unitIds: string[],
    toBranchId: string,
  ) => Promise<InventoryItem>;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (options?: { silent?: boolean }) => {
    const silent = options?.silent && hydrated;
    if (!silent) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await fetchInventory();
      setItems(data);
    } catch {
      setError("Could not connect to the server. Is the backend running?");
    } finally {
      if (!silent) {
        setLoading(false);
      }
      setHydrated(true);
    }
  }, [hydrated]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onFocus = () => refresh({ silent: true });
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refresh({ silent: true });
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibilityChange);
    const interval = window.setInterval(
      () => refresh({ silent: true }),
      AUTO_REFRESH_MS,
    );

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.clearInterval(interval);
    };
  }, [refresh]);

  const markUnitsSold = useCallback((itemCodes: string[]) => {
    setItems((prev) => patchUnitsStatus(prev, itemCodes, "Sold"));
  }, []);

  const markUnitsReserved = useCallback((itemCodes: string[]) => {
    setItems((prev) => patchUnitsStatus(prev, itemCodes, "Reserved"));
  }, []);

  const markUnitsAvailable = useCallback((itemCodes: string[]) => {
    setItems((prev) => patchUnitsStatus(prev, itemCodes, "Available"));
  }, []);

  const addProduct = useCallback(async (input: NewProductInput) => {
    const product = await createProduct(input);
    setItems((prev) => [product, ...prev]);
    return product;
  }, []);

  const updateProduct = useCallback(async (id: string, input: UpdateProductInput) => {
    const updated = await updateProductApi(id, input);
    setItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    await refresh({ silent: true });
    return updated;
  }, [refresh]);

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

  const transferUnits = useCallback(
    async (productId: string, unitIds: string[], toBranchId: string) => {
      const updated = await transferInventoryUnitsApi(productId, {
        unitIds,
        toBranchId,
      });
      setItems((prev) => prev.map((item) => (item.id === productId ? updated : item)));
      return updated;
    },
    [],
  );

  const value = useMemo(
    () => ({
      items,
      hydrated,
      loading,
      error,
      refresh,
      markUnitsSold,
      markUnitsReserved,
      markUnitsAvailable,
      addProduct,
      updateProduct,
      deleteProduct,
      removeUnit,
      addQuantityToSku,
      transferUnits,
    }),
    [
      items,
      hydrated,
      loading,
      error,
      refresh,
      markUnitsSold,
      markUnitsReserved,
      markUnitsAvailable,
      addProduct,
      updateProduct,
      deleteProduct,
      removeUnit,
      addQuantityToSku,
      transferUnits,
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
