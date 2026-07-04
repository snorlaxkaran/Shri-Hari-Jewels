"use client";

import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { saveTransferShipping } from "@/lib/api/inventory";
import { getApiErrorMessage } from "@/lib/api/client";
import type { StockTransfer } from "@/lib/types";

type Props = {
  open: boolean;
  transfer: StockTransfer;
  onClose: () => void;
  onSuccess: (updated: StockTransfer) => void;
};

const today = () => new Date().toISOString().slice(0, 10);

const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";
const inputClass = "input-field w-full px-3 py-2 text-sm";

const computeNetWeight = (transfer: StockTransfer) =>
  transfer.items.reduce((sum, item) => sum + (item.weightGrams ?? 0), 0);

export default function CourierDetailsModal({
  open,
  transfer,
  onClose,
  onSuccess,
}: Props) {
  const netWeight = useMemo(() => computeNetWeight(transfer), [transfer]);
  const netWeightLabel = `${netWeight.toFixed(3)} g`;

  const [contactPersonName, setContactPersonName] = useState("");
  const [contactPersonPhone, setContactPersonPhone] = useState("");
  const [courierCompany, setCourierCompany] = useState("");
  const [dispatchDate, setDispatchDate] = useState(today());
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setContactPersonName(transfer.contactPersonName ?? "");
    setContactPersonPhone(transfer.contactPersonPhone ?? "");
    setCourierCompany(transfer.courierCompany ?? "");
    setDispatchDate(
      transfer.dispatchDate
        ? transfer.dispatchDate.slice(0, 10)
        : today(),
    );
    setError("");
  }, [open, transfer]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !submitting) onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, submitting]);

  if (!open) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!contactPersonName.trim()) {
      setError("Contact person name is required.");
      return;
    }
    if (!contactPersonPhone.trim()) {
      setError("Contact person phone is required.");
      return;
    }
    if (!courierCompany.trim()) {
      setError("Courier company is required.");
      return;
    }
    if (!dispatchDate) {
      setError("Dispatch date is required.");
      return;
    }

    setSubmitting(true);
    try {
      const updated = await saveTransferShipping(transfer.id, {
        contactPersonName: contactPersonName.trim(),
        contactPersonPhone: contactPersonPhone.trim(),
        courierCompany: courierCompany.trim(),
        dispatchDate,
      });
      onSuccess(updated);
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save courier details."));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="surface-card flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 px-5 py-4">
          <h2 className="text-base font-semibold text-zinc-900">
            Courier &amp; Invoice Details
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="text-zinc-400 hover:text-zinc-700 disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="overflow-auto px-5 py-4 space-y-4">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className={labelClass}>Contact Person Name</label>
            <input
              type="text"
              value={contactPersonName}
              onChange={(event) => setContactPersonName(event.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Contact Person Phone</label>
            <input
              type="tel"
              value={contactPersonPhone}
              onChange={(event) => setContactPersonPhone(event.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Courier Company</label>
            <input
              type="text"
              value={courierCompany}
              onChange={(event) => setCourierCompany(event.target.value)}
              required
              placeholder="Blue Dart, DTDC, FedEx..."
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Dispatch Date</label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(event) => setDispatchDate(event.target.value)}
              required
              className={inputClass}
            />
          </div>

          <div>
            <label className={labelClass}>Net Weight (auto-calculated)</label>
            <input
              type="text"
              value={netWeightLabel}
              readOnly
              className={`${inputClass} bg-zinc-50 text-zinc-600`}
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="btn-secondary px-4 py-2 text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
            >
              {submitting ? "Saving..." : "Save & Generate Invoice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
