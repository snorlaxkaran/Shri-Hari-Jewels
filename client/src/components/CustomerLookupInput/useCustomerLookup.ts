"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { lookupCustomerByQuery } from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Customer } from "@/lib/types";
import { isLookupReady, type CustomerInputState } from "./types";

const DEBOUNCE_MS = 300;

export const useCustomerLookup = () => {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<CustomerInputState>("idle");
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState("");
  const requestId = useRef(0);

  const runLookup = useCallback(async (q: string) => {
    const trimmed = q.trim();
    if (!isLookupReady(trimmed)) {
      setState(trimmed.length === 0 ? "idle" : "idle");
      setCustomer(null);
      setError("");
      return;
    }

    const id = ++requestId.current;
    setState("searching");
    setError("");

    try {
      const result = await lookupCustomerByQuery(trimmed);
      if (id !== requestId.current) return;

      if (result.found) {
        setCustomer(result.customer);
        setState("found");
      } else {
        setCustomer(null);
        setState("not_found");
      }
    } catch (err) {
      if (id !== requestId.current) return;
      setError(getApiErrorMessage(err, "Lookup failed."));
      setState("idle");
      setCustomer(null);
    }
  }, []);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setState("idle");
      setCustomer(null);
      setError("");
      return;
    }

    if (!isLookupReady(trimmed)) {
      setState("idle");
      setCustomer(null);
      setError("");
      return;
    }

    setState("searching");
    const timer = window.setTimeout(() => {
      void runLookup(trimmed);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query, runLookup]);

  const reset = useCallback(() => {
    requestId.current += 1;
    setQuery("");
    setState("idle");
    setCustomer(null);
    setError("");
  }, []);

  const markSaved = useCallback((saved: Customer) => {
    setCustomer(saved);
    setState("found");
  }, []);

  const retry = useCallback(() => {
    void runLookup(query);
  }, [query, runLookup]);

  return {
    query,
    setQuery,
    state,
    customer,
    error,
    reset,
    markSaved,
    retry,
  };
};
