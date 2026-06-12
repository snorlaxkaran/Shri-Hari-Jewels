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
  RecordCartSaleResult,
  RecordSaleInput,
  RecordSaleResult,
  SalesAnalytics,
} from "@/lib/types";
import {
  cancelPendingSale as cancelPendingSaleApi,
  confirmSalePayment as confirmSalePaymentApi,
  fetchSalesAnalytics,
  recordSale as recordSaleApi,
} from "@/lib/api/sales";

type SalesContextValue = {
  analytics: SalesAnalytics | null;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  recordSale: (input: RecordSaleInput) => Promise<RecordSaleResult>;
  confirmSalePayment: (
    saleId: string,
    paymentRef?: string,
  ) => Promise<RecordSaleResult | RecordCartSaleResult>;
  cancelPendingSale: (saleId: string) => Promise<void>;
};

const SalesContext = createContext<SalesContextValue | null>(null);

export function SalesProvider({ children }: { children: React.ReactNode }) {
  const [analytics, setAnalytics] = useState<SalesAnalytics | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSalesAnalytics();
      setAnalytics(data);
    } catch {
      setError("Could not load sales data. Is the backend running?");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const recordSale = useCallback(
    async (input: RecordSaleInput) => {
      const result = await recordSaleApi(input);
      if (!result.requiresConfirmation) {
        await refresh();
      }
      return result;
    },
    [refresh],
  );

  const confirmSalePayment = useCallback(
    async (saleId: string, paymentRef?: string) => {
      const result = await confirmSalePaymentApi(saleId, paymentRef);
      await refresh();
      return result;
    },
    [refresh],
  );

  const cancelPendingSale = useCallback(async (saleId: string) => {
    await cancelPendingSaleApi(saleId);
  }, []);

  const value = useMemo(
    () => ({
      analytics,
      hydrated,
      loading,
      error,
      refresh,
      recordSale,
      confirmSalePayment,
      cancelPendingSale,
    }),
    [
      analytics,
      hydrated,
      loading,
      error,
      refresh,
      recordSale,
      confirmSalePayment,
      cancelPendingSale,
    ],
  );

  return (
    <SalesContext.Provider value={value}>{children}</SalesContext.Provider>
  );
}

export const useSales = () => {
  const ctx = useContext(SalesContext);
  if (!ctx) {
    throw new Error("useSales must be used within SalesProvider");
  }
  return ctx;
};
