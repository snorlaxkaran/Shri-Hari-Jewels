"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import { fetchSettings, updateSettings } from "@/lib/api/settings";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ShopSettings } from "@/lib/types";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function SettingsPage() {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [upiVpa, setUpiVpa] = useState("");

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        setSettings(data);
        setBusinessName(data.businessName);
        setAddress(data.address ?? "");
        setPhone(data.phone ?? "");
        setUpiVpa(data.upiVpa ?? "");
      })
      .catch(() => setError("Could not load settings."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);
    try {
      const updated = await updateSettings({
        businessName: businessName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        upiVpa: upiVpa.trim(),
      });
      setSettings(updated);
      setSuccess("Settings saved.");
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to save settings."));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <PageSkeleton />;

  return (
    <div>
      <PageHeader
        title="Settings"
        subtitle="Store details and UPI payment configuration"
      />

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 rounded-lg text-sm border border-emerald-200 bg-emerald-50 text-emerald-700">
          {success}
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Store Information</h2>
          <div>
            <label className={labelClass}>Business name</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Address</label>
            <input value={address} onChange={(e) => setAddress(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
          </div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">UPI Payments</h2>
          <p className="text-xs text-zinc-500">
            For automatic UPI detection, add Razorpay keys to the server{" "}
            <code className="text-[10px] bg-zinc-100 px-1 rounded">.env</code> file.
            The UPI ID below is only used as a fallback for manual confirmation.
          </p>
          <div>
            <label className={labelClass}>UPI ID (VPA) *</label>
            <input
              value={upiVpa}
              onChange={(e) => setUpiVpa(e.target.value)}
              placeholder="e.g. yourstore@paytm"
              className={fieldClass}
            />
          </div>
        </div>

        <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {settings && (
        <p className="mt-4 text-xs text-zinc-400">
          UPI QR payments require a valid VPA. Cash and Card sales complete immediately with an invoice.
        </p>
      )}
    </div>
  );
}
