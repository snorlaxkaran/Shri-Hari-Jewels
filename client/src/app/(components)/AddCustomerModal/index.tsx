"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { NewCustomerInput } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";
import CustomerFinancialFields, {
  emptyCustomerFinancialValues,
  financialValuesToInput,
} from "@/app/(components)/CustomerFinancialFields";

type AddCustomerModalProps = {
  open: boolean;
  onClose: () => void;
  onSubmit: (input: NewCustomerInput) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function AddCustomerModal({
  open,
  onClose,
  onSubmit,
}: AddCustomerModalProps) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [ringSize, setRingSize] = useState("");
  const [preferences, setPreferences] = useState("");
  const [financial, setFinancial] = useState(emptyCustomerFinancialValues());
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
    setName("");
    setMobile("");
    setEmail("");
    setBirthday("");
    setAnniversary("");
    setRingSize("");
    setPreferences("");
    setFinancial(emptyCustomerFinancialValues());
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
    if (!name.trim()) {
      setError("Name is required.");
      return;
    }
    if (!mobile.trim()) {
      setError("Mobile number is required.");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || undefined,
        birthday: birthday || undefined,
        anniversary: anniversary || undefined,
        ringSize: ringSize.trim() || undefined,
        preferences: preferences.trim() || undefined,
        ...financialValuesToInput(financial),
      });
      reset();
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add customer."));
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
          <h2 className="text-base font-semibold text-zinc-900">Add Customer</h2>
          <button onClick={handleClose} disabled={submitting} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} autoFocus />
            </div>
            <div>
              <label className={labelClass}>Mobile *</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Ring Size</label>
              <input value={ringSize} onChange={(e) => setRingSize(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Birthday</label>
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Anniversary</label>
              <input type="date" value={anniversary} onChange={(e) => setAnniversary(e.target.value)} className={fieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Preferences</label>
              <textarea value={preferences} onChange={(e) => setPreferences(e.target.value)} className={fieldClass} rows={2} />
            </div>
          </div>

          <CustomerFinancialFields values={financial} onChange={setFinancial} />

          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={handleClose} disabled={submitting} className="btn-secondary flex-1 px-4 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
              {submitting ? "Saving…" : "Add Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
