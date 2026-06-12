"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Customer, NewOrderInput } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

type AddOrderModalProps = {
  open: boolean;
  onClose: () => void;
  customers: Customer[];
  onSubmit: (input: NewOrderInput) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function AddOrderModal({
  open,
  onClose,
  customers,
  onSubmit,
}: AddOrderModalProps) {
  const [customerId, setCustomerId] = useState("");
  const [description, setDescription] = useState("");
  const [estimatedTotal, setEstimatedTotal] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  const reset = () => {
    setCustomerId("");
    setDescription("");
    setEstimatedTotal("");
    setDueDate("");
    setNotes("");
    setError("");
  };

  const handleClose = () => {
    if (submitting) return;
    reset();
    onClose();
  };

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
      reset();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create order."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-zinc-900">New Custom Order</h2>
          <button onClick={handleClose} disabled={submitting} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className={fieldClass}>
              <option value="">Select customer…</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} — {c.mobile}
                </option>
              ))}
            </select>
            {customers.length === 0 && (
              <p className="text-[11px] mt-1 text-amber-600">Add a customer first before creating an order.</p>
            )}
          </div>
          <div>
            <label className={labelClass}>Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. 22K gold necklace with kundan work"
              className={fieldClass}
              rows={3}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Estimated total (₹)</label>
              <input type="number" min="0" value={estimatedTotal} onChange={(e) => setEstimatedTotal(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Due date</label>
              <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className={fieldClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className={fieldClass} rows={2} />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={handleClose} disabled={submitting} className="btn-secondary flex-1 px-4 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={submitting || customers.length === 0} className="btn-primary flex-1 px-4 py-2.5 text-sm">
              {submitting ? "Creating…" : "Create Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
