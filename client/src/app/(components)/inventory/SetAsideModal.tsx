"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import CustomerLookupInput, {
  type CustomerLookupSelection,
} from "@/components/CustomerLookupInput";
import { getApiErrorMessage } from "@/lib/api/client";
import type { InventoryUnitRow } from "@/lib/inventory/unit-rows";

type SetAsideModalProps = {
  open: boolean;
  row: InventoryUnitRow | null;
  onClose: () => void;
  onSubmit: (input: {
    customerName: string;
    customerId?: string;
    notes?: string;
  }) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function SetAsideModal({
  open,
  row,
  onClose,
  onSubmit,
}: SetAsideModalProps) {
  const [customerSelection, setCustomerSelection] =
    useState<CustomerLookupSelection | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setCustomerSelection(null);
    setCustomerName("");
    setNotes("");
    setError("");
  }, [open, row?.unitId]);

  useEffect(() => {
    const linkedName = customerSelection?.fields.name.trim();
    if (linkedName) setCustomerName(linkedName);
  }, [customerSelection]);

  if (!open || !row) return null;

  const resolvedName = customerName.trim();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvedName) {
      setError("Enter the customer name.");
      return;
    }

    setError("");
    setSubmitting(true);
    try {
      await onSubmit({
        customerName: resolvedName,
        customerId: customerSelection?.customerId,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to set item aside."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="surface-card w-full max-w-md shadow-xl"
        role="dialog"
        aria-labelledby="set-aside-title"
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4 border-b border-zinc-200">
          <div>
            <h2 id="set-aside-title" className="text-base font-semibold text-zinc-900">
              Set aside for customer
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              {row.itemCode} · {row.name}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          <div>
            <label htmlFor="hold-customer-name" className={labelClass}>
              Customer name
            </label>
            <input
              id="hold-customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={fieldClass}
              placeholder="e.g. Rajesh Mehta"
              autoFocus
            />
          </div>

          <div>
            <label className={labelClass}>Link to customer record (optional)</label>
            <CustomerLookupInput onSelectionChange={setCustomerSelection} />
          </div>

          <div>
            <label htmlFor="hold-notes" className={labelClass}>
              Notes (optional)
            </label>
            <textarea
              id="hold-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={`${fieldClass} min-h-[72px] resize-y`}
              placeholder="e.g. Will collect tomorrow evening"
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="btn-secondary px-4 py-2 text-sm"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-2 text-sm"
              disabled={submitting || !resolvedName}
            >
              {submitting ? "Saving…" : "Set aside"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
