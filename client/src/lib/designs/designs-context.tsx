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
  Design,
  NewDesignElementInput,
  NewDesignInput,
  UpdateDesignElementInput,
  UpdateDesignInput,
} from "@/lib/types";
import {
  addDesignElement as addDesignElementApi,
  createDesign as createDesignApi,
  deleteDesign as deleteDesignApi,
  deleteDesignElement as deleteDesignElementApi,
  fetchDesigns,
  updateDesign as updateDesignApi,
  updateDesignElement as updateDesignElementApi,
} from "@/lib/api/designs";

type DesignsContextValue = {
  designs: Design[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addDesign: (input: NewDesignInput) => Promise<Design>;
  patchDesign: (id: string, input: UpdateDesignInput) => Promise<Design>;
  removeDesign: (id: string) => Promise<void>;
  addElement: (
    designId: string,
    input: NewDesignElementInput,
  ) => Promise<Design>;
  patchElement: (
    designId: string,
    elementId: string,
    input: UpdateDesignElementInput,
  ) => Promise<Design>;
  removeElement: (designId: string, elementId: string) => Promise<Design>;
};

const DesignsContext = createContext<DesignsContextValue | null>(null);

export function DesignsProvider({ children }: { children: React.ReactNode }) {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchDesigns();
      setDesigns(data);
    } catch {
      setError("Could not load designs. Is the backend running?");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addDesign = useCallback(async (input: NewDesignInput) => {
    const design = await createDesignApi(input);
    setDesigns((prev) =>
      [...prev, design].sort((a, b) => a.code.localeCompare(b.code)),
    );
    return design;
  }, []);

  const patchDesign = useCallback(
    async (id: string, input: UpdateDesignInput) => {
      const design = await updateDesignApi(id, input);
      setDesigns((prev) => prev.map((d) => (d.id === id ? design : d)));
      return design;
    },
    [],
  );

  const removeDesign = useCallback(async (id: string) => {
    await deleteDesignApi(id);
    setDesigns((prev) => prev.filter((d) => d.id !== id));
  }, []);

  const addElement = useCallback(
    async (designId: string, input: NewDesignElementInput) => {
      const design = await addDesignElementApi(designId, input);
      setDesigns((prev) => prev.map((d) => (d.id === designId ? design : d)));
      return design;
    },
    [],
  );

  const patchElement = useCallback(
    async (
      designId: string,
      elementId: string,
      input: UpdateDesignElementInput,
    ) => {
      const design = await updateDesignElementApi(
        designId,
        elementId,
        input,
      );
      setDesigns((prev) => prev.map((d) => (d.id === designId ? design : d)));
      return design;
    },
    [],
  );

  const removeElement = useCallback(
    async (designId: string, elementId: string) => {
      const design = await deleteDesignElementApi(designId, elementId);
      setDesigns((prev) => prev.map((d) => (d.id === designId ? design : d)));
      return design;
    },
    [],
  );

  const value = useMemo(
    () => ({
      designs,
      hydrated,
      loading,
      error,
      refresh,
      addDesign,
      patchDesign,
      removeDesign,
      addElement,
      patchElement,
      removeElement,
    }),
    [
      designs,
      hydrated,
      loading,
      error,
      refresh,
      addDesign,
      patchDesign,
      removeDesign,
      addElement,
      patchElement,
      removeElement,
    ],
  );

  return (
    <DesignsContext.Provider value={value}>{children}</DesignsContext.Provider>
  );
}

export const useDesigns = () => {
  const ctx = useContext(DesignsContext);
  if (!ctx) {
    throw new Error("useDesigns must be used within DesignsProvider");
  }
  return ctx;
};
