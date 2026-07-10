"use client";

import { useEffect, useState } from "react";
import PageHeader from "@/app/(components)/PageHeader";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import UsersPanel from "@/app/(components)/settings/UsersPanel";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageSettings } from "@/lib/auth/permissions";
import { fetchSettings, updateSettings } from "@/lib/api/settings";
import { getApiErrorMessage } from "@/lib/api/client";
import type { ShopSettings } from "@/lib/types";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function SettingsPage() {
  const { user } = useAuth();
  const isAdmin = user ? canManageSettings(user.role) : false;
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [businessName, setBusinessName] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [addressLine2, setAddressLine2] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [pincode, setPincode] = useState("");
  const [country, setCountry] = useState("India");
  const [phone, setPhone] = useState("");
  const [upiVpa, setUpiVpa] = useState("");
  const [panNumber, setPanNumber] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [gstRegisteredName, setGstRegisteredName] = useState("");
  const [bankAccountName, setBankAccountName] = useState("");
  const [bankAccountNumber, setBankAccountNumber] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [bankName, setBankName] = useState("");
  const [goldMakingChargesPct, setGoldMakingChargesPct] = useState("17");
  const [silverMakingChargesPct, setSilverMakingChargesPct] = useState("17");

  useEffect(() => {
    fetchSettings()
      .then((data) => {
        setSettings(data);
        setBusinessName(data.businessName);
        setAddressLine1(data.addressLine1 ?? data.address ?? "");
        setAddressLine2(data.addressLine2 ?? "");
        setCity(data.city ?? "");
        setState(data.state ?? "");
        setPincode(data.pincode ?? "");
        setCountry(data.country ?? "India");
        setPhone(data.phone ?? "");
        setUpiVpa(data.upiVpa ?? "");
        setPanNumber(data.panNumber ?? "");
        setGstNumber(data.gstNumber ?? "");
        setGstRegisteredName(data.gstRegisteredName ?? "");
        setBankAccountName(data.bankAccountName ?? "");
        setBankAccountNumber(data.bankAccountNumber ?? "");
        setBankIfsc(data.bankIfsc ?? "");
        setBankName(data.bankName ?? "");
        setGoldMakingChargesPct(String(data.goldMakingChargesPct ?? 17));
        setSilverMakingChargesPct(String(data.silverMakingChargesPct ?? 17));
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
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        state: state.trim(),
        pincode: pincode.trim(),
        country: country.trim(),
        phone: phone.trim(),
        upiVpa: upiVpa.trim(),
        panNumber: panNumber.trim(),
        gstNumber: gstNumber.trim(),
        gstRegisteredName: gstRegisteredName.trim(),
        bankAccountName: bankAccountName.trim(),
        bankAccountNumber: bankAccountNumber.trim(),
        bankIfsc: bankIfsc.trim(),
        bankName: bankName.trim(),
        goldMakingChargesPct: Number(goldMakingChargesPct),
        silverMakingChargesPct: Number(silverMakingChargesPct),
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
    <div className="page-content">
      <PageHeader
        title="Settings"
        subtitle="Business details, tax registration, and payment configuration"
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
          <h2 className="text-sm font-semibold text-zinc-900">Business Information</h2>
          <div>
            <label className={labelClass}>Business name</label>
            <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>GST registered name</label>
            <input
              value={gstRegisteredName}
              onChange={(e) => setGstRegisteredName(e.target.value)}
              placeholder="If different from business name"
              className={fieldClass}
            />
          </div>
          <div>
            <label className={labelClass}>Phone</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className={fieldClass} />
          </div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Registered Address</h2>
          <div>
            <label className={labelClass}>Address Line 1</label>
            <input value={addressLine1} onChange={(e) => setAddressLine1(e.target.value)} className={fieldClass} />
          </div>
          <div>
            <label className={labelClass}>Address Line 2</label>
            <input value={addressLine2} onChange={(e) => setAddressLine2(e.target.value)} className={fieldClass} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>City</label>
              <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>State</label>
              <input value={state} onChange={(e) => setState(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Pincode</label>
              <input
                value={pincode}
                onChange={(e) => setPincode(e.target.value)}
                maxLength={6}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Country</label>
              <input value={country} onChange={(e) => setCountry(e.target.value)} className={fieldClass} />
            </div>
          </div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Tax Registration</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>PAN</label>
              <input
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                maxLength={10}
                placeholder="AAAAA9999A"
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>GST Number</label>
              <input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value.toUpperCase())}
                maxLength={15}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Bank Details</h2>
          <p className="text-xs text-zinc-500">Shown on invoices for bank transfer instructions.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Bank name</label>
              <input value={bankName} onChange={(e) => setBankName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Account holder name</label>
              <input value={bankAccountName} onChange={(e) => setBankAccountName(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>Account number</label>
              <input value={bankAccountNumber} onChange={(e) => setBankAccountNumber(e.target.value)} className={fieldClass} />
            </div>
            <div>
              <label className={labelClass}>IFSC</label>
              <input
                value={bankIfsc}
                onChange={(e) => setBankIfsc(e.target.value.toUpperCase())}
                maxLength={11}
                placeholder="AAAA0XXXXXX"
                className={fieldClass}
              />
            </div>
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

        {isAdmin && (
          <div className="surface-card p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-900">Pricing</h2>
            <p className="text-xs text-zinc-500">
              Making charges are applied as a percentage of metal value at the time of sale.
              Live metal rates can be refreshed from the banner at the top of the app.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Gold (22K) making charges (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={goldMakingChargesPct}
                  onChange={(e) => setGoldMakingChargesPct(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Silver (925) making charges (%)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={silverMakingChargesPct}
                  onChange={(e) => setSilverMakingChargesPct(e.target.value)}
                  className={fieldClass}
                />
              </div>
            </div>
            <p className="text-xs text-zinc-500">
              Rate API key: set <code className="text-[10px] bg-zinc-100 px-1 rounded">METALS_API_KEY</code> in server{" "}
              <code className="text-[10px] bg-zinc-100 px-1 rounded">.env</code> for automatic daily fetches.
            </p>
          </div>
        )}

        <button type="submit" disabled={saving} className="btn-primary px-6 py-2.5 text-sm disabled:opacity-50">
          {saving ? "Saving…" : "Save Changes"}
        </button>
      </form>

      {settings && (
        <p className="mt-4 text-xs text-zinc-400">
          UPI QR payments require a valid VPA. Cash and Card sales complete immediately with an invoice.
        </p>
      )}

      {isAdmin && (
        <div className="mt-10">
          <UsersPanel />
        </div>
      )}
    </div>
  );
}
