"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import type { Customer, UpdateCustomerInput } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";

type EditCustomerModalProps = {
  open: boolean;
  customer: Customer;
  onClose: () => void;
  onSubmit: (input: UpdateCustomerInput) => Promise<void>;
};

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");

export default function EditCustomerModal({
  open,
  customer,
  onClose,
  onSubmit,
}: EditCustomerModalProps) {
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [ringSize, setRingSize] = useState("");
  const [preferences, setPreferences] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(customer.name);
    setMobile(customer.mobile);
    setEmail(customer.email ?? "");
    setCity(customer.city ?? "");
    setAddress(customer.address ?? "");
    setBirthday(toDateInput(customer.birthday));
    setAnniversary(toDateInput(customer.anniversary));
    setRingSize(customer.ringSize ?? "");
    setPreferences(customer.preferences ?? "");
    setError("");
  }, [open, customer]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim() || !mobile.trim()) {
      setError("Name and mobile are required.");
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim() || null,
        city: city.trim() || null,
        address: address.trim() || null,
        birthday: birthday || null,
        anniversary: anniversary || null,
        ringSize: ringSize.trim() || null,
        preferences: preferences.trim() || null,
      });
      onClose();
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden />
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-200 sticky top-0 bg-white">
          <h2 className="text-base font-semibold text-zinc-900">Edit Customer</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-600">
            <X size={18} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
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
              <label className={labelClass}>City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Address</label>
              <input value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Birthday</label>
              <input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Anniversary</label>
              <input type="date" value={anniversary} onChange={(e) => setAnniversary(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Ring Size</label>
              <input value={ringSize} onChange={(e) => setRingSize(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Preferences</label>
              <input value={preferences} onChange={(e) => setPreferences(e.target.value)} className={fieldClass} />
            </div>
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="btn-secondary flex-1 px-4 py-2.5 text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
