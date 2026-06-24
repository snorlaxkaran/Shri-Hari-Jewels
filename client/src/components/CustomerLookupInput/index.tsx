"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Customer } from "@/lib/types";
import FoundCard from "./FoundCard";
import NewCustomerForm from "./NewCustomerForm";
import {
  buildDirtyFields,
  customerToFields,
  emptyFields,
  type CustomerLookupFields,
  type CustomerLookupSelection,
} from "./types";
import { useCustomerLookup } from "./useCustomerLookup";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export type { CustomerLookupSelection } from "./types";

export type CustomerLookupInputProps = {
  onSelectionChange: (selection: CustomerLookupSelection | null) => void;
  paymentModeSet?: boolean;
  onPaymentModeClear?: () => void;
};

const prefillFromQuery = (
  query: string,
  base: CustomerLookupFields,
): CustomerLookupFields => {
  const q = query.trim();
  if (/^\d{10}$/.test(q)) return { ...base, mobile: q };
  if (q.includes("@")) return { ...base, email: q };
  if (/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i.test(q)) {
    return { ...base, gstNumber: q.toUpperCase() };
  }
  return base;
};

export default function CustomerLookupInput({
  onSelectionChange,
  paymentModeSet,
  onPaymentModeClear,
}: CustomerLookupInputProps) {
  const {
    query,
    setQuery,
    state,
    customer,
    error,
    reset,
    markSaved,
    retry,
  } = useCustomerLookup();

  const [fields, setFields] = useState<CustomerLookupFields>(emptyFields());
  const originalRef = useRef<CustomerLookupFields>(emptyFields());
  const [newFields, setNewFields] = useState<CustomerLookupFields>(emptyFields());

  useEffect(() => {
    if (state === "found" && customer) {
      const next = customerToFields(customer);
      setFields(next);
      originalRef.current = next;
    }
  }, [state, customer]);

  useEffect(() => {
    if (state === "not_found") {
      setNewFields(prefillFromQuery(query, emptyFields()));
    }
  }, [state, query]);

  useEffect(() => {
    if (state === "found" && customer) {
      const dirtyFields = buildDirtyFields(originalRef.current, fields);
      onSelectionChange({
        customerId: customer.id,
        fields,
        dirtyFields,
      });
      return;
    }
    onSelectionChange(null);
  }, [state, customer, fields, onSelectionChange]);

  const handleClear = useCallback(() => {
    if (paymentModeSet) {
      const ok = window.confirm(
        "Removing customer will clear payment mode. Continue?",
      );
      if (!ok) return;
      onPaymentModeClear?.();
    }
    reset();
    setFields(emptyFields());
    setNewFields(emptyFields());
    originalRef.current = emptyFields();
    onSelectionChange(null);
  }, [paymentModeSet, onPaymentModeClear, reset, onSelectionChange]);

  const handleSaved = useCallback(
    (saved: Customer) => {
      markSaved(saved);
      const next = customerToFields(saved);
      setFields(next);
      originalRef.current = next;
    },
    [markSaved],
  );

  const handleLoadExisting = useCallback(
    (mobile: string) => {
      setQuery(mobile);
    },
    [setQuery],
  );

  return (
    <div className="space-y-3">
      <div>
        <label className={labelClass}>Customer *</label>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by mobile, email, or GST…"
          className={fieldClass}
        />
        {state === "searching" && (
          <p className="text-xs text-zinc-400 mt-1">Searching…</p>
        )}
        {error && (
          <div className="mt-2 text-xs text-red-500 flex items-center gap-2">
            <span>{error}</span>
            <button
              type="button"
              onClick={retry}
              className="underline font-medium text-red-700"
            >
              Retry
            </button>
          </div>
        )}
      </div>

      {state === "found" && customer && (
        <FoundCard
          customer={customer}
          fields={fields}
          originalFields={originalRef.current}
          onChange={setFields}
          onClear={handleClear}
        />
      )}

      {state === "not_found" && (
        <NewCustomerForm
          query={query}
          fields={newFields}
          onChange={setNewFields}
          onSaved={handleSaved}
          onLoadExisting={handleLoadExisting}
        />
      )}
    </div>
  );
}
