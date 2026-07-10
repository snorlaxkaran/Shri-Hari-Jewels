"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { Customer, NewOrderInput } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type OrderFormProps = {
  customers: Customer[];
  cancelHref: string;
  onCancelClick?: () => void;
  onSubmit: (input: NewOrderInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

export default function OrderForm({
  customers,
  cancelHref,
  onCancelClick,
  onSubmit,
  onDirtyChange,
}: OrderFormProps) {
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedTotal, setEstimatedTotal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const markDirty = () => setDirty(true);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!customerId) {
      setError("Select a customer.");
      return;
    }
    if (!description.trim()) {
      setError("Order description is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        customerId,
        description: description.trim(),
        estimatedTotal: estimatedTotal ? parseFloat(estimatedTotal) : undefined,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      setDirty(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create order."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="surface-card p-5 space-y-4">
        <div>
          <label className={labelClass}>Customer *</label>
          <select
            value={customerId}
            onChange={(e) => {
              setCustomerId(e.target.value);
              markDirty();
            }}
            className={fieldClass}
            autoFocus
          >
            <option value="">Select customer…</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} — {c.mobile}
              </option>
            ))}
          </select>
          {customers.length === 0 && (
            <p className="text-[11px] mt-1 text-amber-600">
              Add a customer first before creating an order.
            </p>
          )}
        </div>
        <div>
          <label className={labelClass}>Description *</label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
            placeholder="e.g. 22K gold necklace with kundan work"
            className={fieldClass}
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={labelClass}>Estimated total (₹)</label>
            <input
              type="number"
              min="0"
              value={estimatedTotal}
              onChange={(e) => {
                setEstimatedTotal(e.target.value);
                markDirty();
              }}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Due date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => {
                setDueDate(e.target.value);
                markDirty();
              }}
              className={fieldClass}
            />
          </div>
        </div>
        <div>
          <label className={labelClass}>Notes</label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              markDirty();
            }}
            className={fieldClass}
            rows={2}
          />
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        {onCancelClick ? (
          <button type="button" onClick={onCancelClick} className="btn-secondary flex-1 px-4 py-2.5 text-sm">
            Cancel
          </button>
        ) : (
          <Link href={cancelHref} className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center">
            Cancel
          </Link>
        )}
        <button
          type="submit"
          disabled={submitting || customers.length === 0}
          className="btn-primary flex-1 px-4 py-2.5 text-sm"
        >
          {submitting ? "Creating…" : "Create Order"}
        </button>
      </div>
    </form>
  );
}
