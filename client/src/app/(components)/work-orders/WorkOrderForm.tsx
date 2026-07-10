"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NewWorkOrderInput, Order } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type WorkOrderFormProps = {
  orders: Order[];
  cancelHref: string;
  onSubmit: (input: NewWorkOrderInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

export default function WorkOrderForm({
  orders,
  cancelHref,
  onSubmit,
  onDirtyChange,
}: WorkOrderFormProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [orderId, setOrderId] = useState("");
  const [priority, setPriority] = useState<"Low" | "Normal" | "High">("Normal");
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
      setDirty(false);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to create work order."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
      <div className="surface-card p-5 space-y-4">
        <div>
          <label className={labelClass}>Title *</label>
          <input
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              markDirty();
            }}
            className={fieldClass}
            placeholder="E.g. Ring setting and polish"
            autoFocus
          />
        </div>
        <div>
          <label className={labelClass}>Description *</label>
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              markDirty();
            }}
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
              onChange={(e) => {
                setOrderId(e.target.value);
                markDirty();
              }}
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
              onChange={(e) => {
                setPriority(e.target.value as "Low" | "Normal" | "High");
                markDirty();
              }}
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
              onChange={(e) => {
                setDueDate(e.target.value);
                markDirty();
              }}
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Notes</label>
            <input
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                markDirty();
              }}
              className={fieldClass}
              placeholder="Optional instruction"
            />
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3">
        <Link href={cancelHref} className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center">
          Cancel
        </Link>
        <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
          {submitting ? "Creating…" : "Create Work Order"}
        </button>
      </div>
    </form>
  );
}
