"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { NewWorkOrderInput, Order } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

type AddWorkOrderModalProps = {
  open: boolean;
  onClose: () => void;
  orders: Order[];
  onSubmit: (input: NewWorkOrderInput) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function AddWorkOrderModal({
  open,
  onClose,
  orders,
  onSubmit,
}: AddWorkOrderModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");
  const [priority, setPriority] = useState<"Low" | "Normal" | "High">("Normal");
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
    setTitle("");
    setDescription("");
    setOrderId("");
    setPriority("Normal");
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
    if (!title.trim()) {
      setError("Work order title is required.");
      return;
    }
    if (!description.trim()) {
      setError("Work order description is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        title: title.trim(),
        description: description.trim(),
        orderId: orderId || undefined,
        priority,
        dueDate: dueDate || undefined,
        notes: notes.trim() || undefined,
      });
      reset();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create work order."));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden
      />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-zinc-900">
            New Work Order
          </h2>
          <button
            onClick={handleClose}
            disabled={submitting}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600"
          >
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className={labelClass}>Title *</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={fieldClass}
              placeholder="E.g. Ring setting and polish"
            />
          </div>
          <div>
            <label className={labelClass}>Description *</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className={fieldClass}
              rows={4}
              placeholder="Describe the work required"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Link to order</label>
              <select
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                className={fieldClass}
              >
                <option value="">No specific order</option>
                {orders.map((order) => (
                  <option key={order.id} value={order.id}>
                    {order.orderNo} — {order.customerName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Priority</label>
              <select
                value={priority}
                onChange={(e) =>
                  setPriority(e.target.value as "Low" | "Normal" | "High")
                }
                className={fieldClass}
              >
                <option value="Low">Low</option>
                <option value="Normal">Normal</option>
                <option value="High">High</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Due date</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Notes</label>
              <input
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={fieldClass}
                placeholder="Optional instruction"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={submitting}
              className="btn-secondary flex-1 px-4 py-2.5 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary flex-1 px-4 py-2.5 text-sm"
            >
              {submitting ? "Creating…" : "Create Work Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
