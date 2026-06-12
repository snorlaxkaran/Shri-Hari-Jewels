"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  startTransition,
} from "react";
import { v4 as uuid } from "uuid";
import type { InventoryItem, NewProductInput } from "@/lib/types";
import { CATEGORY_COLORS, type ProductCategory } from "./categories";
import { generateSku, generateUnitCodes } from "./sku";
import { getStockStatus } from "./status";
import { seedInventoryItems } from "./seed";

const STORAGE_KEY = "shj-inventory";

type InventoryContextValue = {
  items: InventoryItem[];
  hydrated: boolean;
  addProduct: (input: NewProductInput) => InventoryItem;
  addQuantityToSku: (sku: string, quantity: number) => InventoryItem | null;
};

const InventoryContext = createContext<InventoryContextValue | null>(null);

let memoryCache: InventoryItem[] | null = null;
let hasLoadedFromStorage = false;

const loadItems = (): InventoryItem[] => {
  if (memoryCache) return memoryCache;
  if (typeof window === "undefined") return seedInventoryItems;

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedInventoryItems;
    const parsed = JSON.parse(raw) as InventoryItem[];
    if (parsed.length === 0) return seedInventoryItems;
    const items = parsed.map((item) => ({
      ...item,
      images: item.images ?? [],
    }));
    memoryCache = items;
    return items;
  } catch {
    return seedInventoryItems;
  }
};

const saveItems = (items: InventoryItem[]) => {
  memoryCache = items;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Quota exceeded — keep in-memory only
  }
};

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>(seedInventoryItems);
  const [hydrated, setHydrated] = useState(hasLoadedFromStorage);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    if (hasLoadedFromStorage && memoryCache) {
      setItems(memoryCache);
      setHydrated(true);
      return;
    }

    const id = requestAnimationFrame(() => {
      const loaded = loadItems();
      hasLoadedFromStorage = true;
      startTransition(() => {
        setItems(loaded);
        setHydrated(true);
      });
    });

    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => saveItems(items), 500);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [items, hydrated]);

  const addProduct = useCallback(
    (input: NewProductInput): InventoryItem => {
      const category = input.category as ProductCategory;
      const existingSkus = items.map((i) => i.sku);
      const existingUnitCodes = items.flatMap((i) =>
        i.units.map((u) => u.itemCode),
      );

      const sku = generateSku(existingSkus, category);
      const unitCodes = generateUnitCodes(
        sku,
        input.quantity,
        existingUnitCodes,
      );
      const now = new Date().toISOString();

      const product: InventoryItem = {
        id: uuid(),
        sku,
        name: input.name.trim(),
        category: input.category,
        metal: input.metal,
        purity: input.purity,
        weightGrams: input.weightGrams,
        makingCharges: input.makingCharges,
        stoneCarat: input.stoneCarat,
        stock: input.quantity,
        price: input.price,
        status: getStockStatus(input.quantity),
        imageColor: CATEGORY_COLORS[category] ?? "#a1a1aa",
        images: input.images,
        createdAt: now,
        units: unitCodes.map((itemCode) => ({
          id: uuid(),
          itemCode,
          sku,
          status: "Available",
          createdAt: now,
        })),
      };

      setItems((prev) => [product, ...prev]);
      return product;
    },
    [items],
  );

  const addQuantityToSku = useCallback(
    (sku: string, quantity: number): InventoryItem | null => {
      let updated: InventoryItem | null = null;

      setItems((prev) =>
        prev.map((item) => {
          if (item.sku !== sku) return item;

          const existingUnitCodes = prev.flatMap((i) =>
            i.units.map((u) => u.itemCode),
          );
          const newCodes = generateUnitCodes(sku, quantity, existingUnitCodes);
          const now = new Date().toISOString();
          const newUnits = newCodes.map((itemCode) => ({
            id: uuid(),
            itemCode,
            sku,
            status: "Available" as const,
            createdAt: now,
          }));

          const stock = item.stock + quantity;
          updated = {
            ...item,
            stock,
            status: getStockStatus(stock),
            units: [...item.units, ...newUnits],
          };
          return updated;
        }),
      );

      return updated;
    },
    [],
  );

  const value = useMemo(
    () => ({ items, hydrated, addProduct, addQuantityToSku }),
    [items, hydrated, addProduct, addQuantityToSku],
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
