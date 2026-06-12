"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { Customer, NewCustomerInput, UpdateCustomerInput } from "@/lib/types";
import {
  createCustomer as createCustomerApi,
  fetchCustomers,
  updateCustomer as updateCustomerApi,
} from "@/lib/api/customers";

type CustomersContextValue = {
  customers: Customer[];
  hydrated: boolean;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  addCustomer: (input: NewCustomerInput) => Promise<Customer>;
  updateCustomer: (id: string, input: UpdateCustomerInput) => Promise<Customer>;
};

const CustomersContext = createContext<CustomersContextValue | null>(null);

export function CustomersProvider({ children }: { children: React.ReactNode }) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchCustomers();
      setCustomers(data);
    } catch {
      setError("Could not load customers. Is the backend running?");
    } finally {
      setLoading(false);
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addCustomer = useCallback(async (input: NewCustomerInput) => {
    const customer = await createCustomerApi(input);
    setCustomers((prev) => [customer, ...prev]);
    return customer;
  }, []);

  const updateCustomer = useCallback(
    async (id: string, input: UpdateCustomerInput) => {
      const customer = await updateCustomerApi(id, input);
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? customer : c)),
      );
      return customer;
    },
    [],
  );

  const value = useMemo(
    () => ({
      customers,
      hydrated,
      loading,
      error,
      refresh,
      addCustomer,
      updateCustomer,
    }),
    [customers, hydrated, loading, error, refresh, addCustomer, updateCustomer],
  );

  return (
    <CustomersContext.Provider value={value}>
      {children}
    </CustomersContext.Provider>
  );
}

export const useCustomers = () => {
  const ctx = useContext(CustomersContext);
  if (!ctx) {
    throw new Error("useCustomers must be used within CustomersProvider");
  }
  return ctx;
};
