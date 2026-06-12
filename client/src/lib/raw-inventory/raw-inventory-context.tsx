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
  AdjustMetalLotInput,
  AdjustStoneLotInput,
  MetalLot,
  NewMetalLotInput,
  NewStoneLotInput,
  RawInventorySummary,
  RawStockAuditLog,
  StoneLot,
  TransferMetalLotInput,
  TransferStoneLotInput,
  UpdateMetalLotInput,
  UpdateStoneLotInput,
} from "@/lib/types";
import {
  adjustMetalLot as adjustMetalLotApi,
  adjustStoneLot as adjustStoneLotApi,
  createMetalLot as createMetalLotApi,
  createStoneLot as createStoneLotApi,
  fetchMetalLots,
  fetchRawInventorySummary,
  fetchRawStockAuditLogs,
  fetchStoneLots,
  transferMetalLot as transferMetalLotApi,
  transferStoneLot as transferStoneLotApi,
  updateMetalLot as updateMetalLotApi,
  updateStoneLot as updateStoneLotApi,
} from "@/lib/api/raw-inventory";

type RawInventoryContextValue = {
  metalLots: MetalLot[];
  stoneLots: StoneLot[];
  auditLogs: RawStockAuditLog[];
  summary: RawInventorySummary | null;
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  refreshAudit: (stockType?: "Metal" | "Stone", stockId?: string) => Promise<void>;
  addMetalLot: (input: NewMetalLotInput) => Promise<MetalLot>;
  updateMetalLot: (id: string, input: UpdateMetalLotInput) => Promise<MetalLot>;
  transferMetalLot: (
    id: string,
    input: TransferMetalLotInput,
  ) => Promise<MetalLot>;
  adjustMetalLot: (id: string, input: AdjustMetalLotInput) => Promise<MetalLot>;
  addStoneLot: (input: NewStoneLotInput) => Promise<StoneLot>;
  updateStoneLot: (id: string, input: UpdateStoneLotInput) => Promise<StoneLot>;
  transferStoneLot: (
    id: string,
    input: TransferStoneLotInput,
  ) => Promise<StoneLot>;
  adjustStoneLot: (id: string, input: AdjustStoneLotInput) => Promise<StoneLot>;
};

const RawInventoryContext = createContext<RawInventoryContextValue | null>(null);

export function RawInventoryProvider({ children }: { children: React.ReactNode }) {
  const [metalLots, setMetalLots] = useState<MetalLot[]>([]);
  const [stoneLots, setStoneLots] = useState<StoneLot[]>([]);
  const [auditLogs, setAuditLogs] = useState<RawStockAuditLog[]>([]);
  const [summary, setSummary] = useState<RawInventorySummary | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshAudit = useCallback(
    async (stockType?: "Metal" | "Stone", stockId?: string) => {
      const logs = await fetchRawStockAuditLogs(stockType, stockId);
      setAuditLogs(logs);
    },
    [],
  );

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [metal, stones, summaryData, logs] = await Promise.all([
        fetchMetalLots(),
        fetchStoneLots(),
        fetchRawInventorySummary(),
        fetchRawStockAuditLogs(),
      ]);
      setMetalLots(metal);
      setStoneLots(stones);
      setSummary(summaryData);
      setAuditLogs(logs);
    } catch {
      setError("Could not load raw inventory. Is the backend running?");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMetalLot = useCallback(async (input: NewMetalLotInput) => {
    const lot = await createMetalLotApi(input);
    setMetalLots((prev) => [lot, ...prev]);
    await refresh();
    return lot;
  }, [refresh]);

  const updateMetalLot = useCallback(async (id: string, input: UpdateMetalLotInput) => {
    const lot = await updateMetalLotApi(id, input);
    setMetalLots((prev) => prev.map((item) => (item.id === id ? lot : item)));
    await refreshAudit();
    await refresh();
    return lot;
  }, [refresh, refreshAudit]);

  const transferMetalLot = useCallback(
    async (id: string, input: TransferMetalLotInput) => {
      const lot = await transferMetalLotApi(id, input);
      setMetalLots((prev) => prev.map((item) => (item.id === id ? lot : item)));
      await refreshAudit();
      return lot;
    },
    [refreshAudit],
  );

  const adjustMetalLot = useCallback(
    async (id: string, input: AdjustMetalLotInput) => {
      const lot = await adjustMetalLotApi(id, input);
      setMetalLots((prev) => prev.map((item) => (item.id === id ? lot : item)));
      await refresh();
      return lot;
    },
    [refresh],
  );

  const addStoneLot = useCallback(async (input: NewStoneLotInput) => {
    const lot = await createStoneLotApi(input);
    setStoneLots((prev) => [lot, ...prev]);
    await refresh();
    return lot;
  }, [refresh]);

  const updateStoneLot = useCallback(async (id: string, input: UpdateStoneLotInput) => {
    const lot = await updateStoneLotApi(id, input);
    setStoneLots((prev) => prev.map((item) => (item.id === id ? lot : item)));
    await refreshAudit();
    await refresh();
    return lot;
  }, [refresh, refreshAudit]);

  const transferStoneLot = useCallback(
    async (id: string, input: TransferStoneLotInput) => {
      const lot = await transferStoneLotApi(id, input);
      setStoneLots((prev) => prev.map((item) => (item.id === id ? lot : item)));
      await refreshAudit();
      return lot;
    },
    [refreshAudit],
  );

  const adjustStoneLot = useCallback(
    async (id: string, input: AdjustStoneLotInput) => {
      const lot = await adjustStoneLotApi(id, input);
      setStoneLots((prev) => prev.map((item) => (item.id === id ? lot : item)));
      await refresh();
      return lot;
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      metalLots,
      stoneLots,
      auditLogs,
      summary,
      hydrated,
      loading,
      error,
      refresh,
      refreshAudit,
      addMetalLot,
      updateMetalLot,
      transferMetalLot,
      adjustMetalLot,
      addStoneLot,
      updateStoneLot,
      transferStoneLot,
      adjustStoneLot,
    }),
    [
      metalLots,
      stoneLots,
      auditLogs,
      summary,
      hydrated,
      loading,
      error,
      refresh,
      refreshAudit,
      addMetalLot,
      updateMetalLot,
      transferMetalLot,
      adjustMetalLot,
      addStoneLot,
      updateStoneLot,
      transferStoneLot,
      adjustStoneLot,
    ],
  );

  return (
    <RawInventoryContext.Provider value={value}>
      {children}
    </RawInventoryContext.Provider>
  );
}

export const useRawInventory = () => {
  const ctx = useContext(RawInventoryContext);
  if (!ctx) {
    throw new Error("useRawInventory must be used within RawInventoryProvider");
  }
  return ctx;
};
