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
  AdjustCertifiedStoneLotInput,
  AdjustMetalLotInput,
  CertifiedStoneLot,
  MetalLot,
  NewCertifiedStoneLotInput,
  NewMetalLotInput,
  RawInventorySummary,
  RawStockAuditLog,
  TransferCertifiedStoneLotInput,
  TransferMetalLotInput,
  UpdateCertifiedStoneLotInput,
  UpdateMetalLotInput,
} from "@/lib/types";
import {
  adjustCertifiedStoneLot as adjustCertifiedStoneLotApi,
  adjustMetalLot as adjustMetalLotApi,
  createCertifiedStoneLot as createCertifiedStoneLotApi,
  createMetalLot as createMetalLotApi,
  fetchCertifiedStoneLots,
  fetchMetalLots,
  fetchRawInventorySummary,
  fetchRawStockAuditLogs,
  transferCertifiedStoneLot as transferCertifiedStoneLotApi,
  transferMetalLot as transferMetalLotApi,
  updateCertifiedStoneLot as updateCertifiedStoneLotApi,
  updateMetalLot as updateMetalLotApi,
} from "@/lib/api/raw-inventory";

type RawInventoryContextValue = {
  metalLots: MetalLot[];
  certifiedStoneLots: CertifiedStoneLot[];
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
  addCertifiedStoneLot: (
    input: NewCertifiedStoneLotInput,
  ) => Promise<CertifiedStoneLot>;
  updateCertifiedStoneLot: (
    id: string,
    input: UpdateCertifiedStoneLotInput,
  ) => Promise<CertifiedStoneLot>;
  transferCertifiedStoneLot: (
    id: string,
    input: TransferCertifiedStoneLotInput,
  ) => Promise<CertifiedStoneLot>;
  adjustCertifiedStoneLot: (
    id: string,
    input: AdjustCertifiedStoneLotInput,
  ) => Promise<CertifiedStoneLot>;
};

const RawInventoryContext = createContext<RawInventoryContextValue | null>(null);

export function RawInventoryProvider({ children }: { children: React.ReactNode }) {
  const [metalLots, setMetalLots] = useState<MetalLot[]>([]);
  const [certifiedStoneLots, setCertifiedStoneLots] = useState<CertifiedStoneLot[]>(
    [],
  );
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
        fetchCertifiedStoneLots(),
        fetchRawInventorySummary(),
        fetchRawStockAuditLogs(),
      ]);
      setMetalLots(metal);
      setCertifiedStoneLots(stones);
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

  const addCertifiedStoneLot = useCallback(
    async (input: NewCertifiedStoneLotInput) => {
      const lot = await createCertifiedStoneLotApi(input);
      setCertifiedStoneLots((prev) => [lot, ...prev]);
      await refresh();
      return lot;
    },
    [refresh],
  );

  const updateCertifiedStoneLot = useCallback(
    async (id: string, input: UpdateCertifiedStoneLotInput) => {
      const lot = await updateCertifiedStoneLotApi(id, input);
      setCertifiedStoneLots((prev) =>
        prev.map((item) => (item.id === id ? lot : item)),
      );
      await refreshAudit();
      await refresh();
      return lot;
    },
    [refresh, refreshAudit],
  );

  const transferCertifiedStoneLot = useCallback(
    async (id: string, input: TransferCertifiedStoneLotInput) => {
      const lot = await transferCertifiedStoneLotApi(id, input);
      setCertifiedStoneLots((prev) =>
        prev.map((item) => (item.id === id ? lot : item)),
      );
      await refreshAudit();
      return lot;
    },
    [refreshAudit],
  );

  const adjustCertifiedStoneLot = useCallback(
    async (id: string, input: AdjustCertifiedStoneLotInput) => {
      const lot = await adjustCertifiedStoneLotApi(id, input);
      setCertifiedStoneLots((prev) =>
        prev.map((item) => (item.id === id ? lot : item)),
      );
      await refresh();
      return lot;
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      metalLots,
      certifiedStoneLots,
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
      addCertifiedStoneLot,
      updateCertifiedStoneLot,
      transferCertifiedStoneLot,
      adjustCertifiedStoneLot,
    }),
    [
      metalLots,
      certifiedStoneLots,
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
      addCertifiedStoneLot,
      updateCertifiedStoneLot,
      transferCertifiedStoneLot,
      adjustCertifiedStoneLot,
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
