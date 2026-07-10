"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import PageHeader from "@/app/(components)/PageHeader";
import {
  CustomerBillingAddressFields,
  CustomerTaxBankSectionCollapsible,
  emptyCustomerFinancialValues,
  financialValuesToInput,
} from "@/app/(components)/CustomerFinancialFields";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageCustomers } from "@/lib/auth/permissions";
import { useCustomers } from "@/lib/customers/customers-context";
import { CUSTOMER_TYPES } from "@/lib/customers/constants";
import { getApiErrorMessage } from "@/lib/api/client";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

export default function NewCustomerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { addCustomer } = useCustomers();
  const canManage = user ? canManageCustomers(user.role) : false;

  const [companyName, setCompanyName] = useState("");
  const [customerType, setCustomerType] = useState<string>("Individual Buyer");
  const [ownerName, setOwnerName] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [ringSize, setRingSize] = useState("");
  const [preferences, setPreferences] = useState("");
  const [financial, setFinancial] = useState(emptyCustomerFinancialValues());
  const [personalOpen, setPersonalOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user && !canManage) {
      router.replace("/customers");
    }
  }, [user, canManage, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!companyName.trim()) {
      setError("Company name is required.");
      return;
    }
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
      const customer = await addCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        companyName: companyName.trim(),
        customerType,
        ownerName: ownerName.trim() || undefined,
        contactPersonName: contactPersonName.trim() || undefined,
        email: email.trim() || undefined,
        birthday: birthday || undefined,
        anniversary: anniversary || undefined,
        ringSize: ringSize.trim() || undefined,
        preferences: preferences.trim() || undefined,
        ...financialValuesToInput(financial),
      });
      router.push(`/customers?selected=${customer.id}`);
    } catch (err) {
      setError(getApiErrorMessage(err, "Failed to add customer."));
    } finally {
      setSubmitting(false);
    }
  };

  if (user && !canManage) {
    return null;
  }

  return (
    <div className="page-content space-y-6">
      <Link
        href="/customers"
        className="inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700"
      >
        <ArrowLeft size={16} />
        Back to customers
      </Link>

      <PageHeader
        title="Add Customer"
        subtitle="Register a new customer with company, billing, and optional personal details"
      />

      {error && (
        <div className="px-4 py-3 rounded-lg text-sm border border-red-200 bg-red-50 text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <div className="surface-card p-5 space-y-4">
          <h2 className="text-sm font-semibold text-zinc-900">Company / Business Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Company Name *</label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className={fieldClass}
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>Customer Type *</label>
              <select
                value={customerType}
                onChange={(e) => setCustomerType(e.target.value)}
                className={fieldClass}
              >
                {CUSTOMER_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Owner Name</label>
              <input
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Primary Contact Person</label>
              <input
                value={contactPersonName}
                onChange={(e) => setContactPersonName(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Customer Name *</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={fieldClass}
                placeholder="Display name for this customer"
              />
            </div>
            <div>
              <label className={labelClass}>Mobile Number *</label>
              <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={fieldClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
        </div>

        <div className="surface-card p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Billing & Financial Details</h2>
            <p className="text-xs text-zinc-500 mt-1">Optional — used on tax invoices for B2B customers.</p>
          </div>
          <CustomerBillingAddressFields values={financial} onChange={setFinancial} />
        </div>

        <div className="surface-card p-5">
          <CustomerTaxBankSectionCollapsible values={financial} onChange={setFinancial} />
        </div>

        <div className="surface-card overflow-hidden">
          <button
            type="button"
            onClick={() => setPersonalOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-zinc-50"
          >
            <span className="text-sm font-semibold text-zinc-900">Personal Details (Optional)</span>
            <ChevronDown
              size={16}
              className={`text-zinc-400 transition-transform ${personalOpen ? "rotate-180" : ""}`}
            />
          </button>
          {personalOpen && (
            <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-zinc-100 pt-4">
              <div>
                <label className={labelClass}>Birthday</label>
                <input
                  type="date"
                  value={birthday}
                  onChange={(e) => setBirthday(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Anniversary</label>
                <input
                  type="date"
                  value={anniversary}
                  onChange={(e) => setAnniversary(e.target.value)}
                  className={fieldClass}
                />
              </div>
              <div>
                <label className={labelClass}>Ring Size</label>
                <input value={ringSize} onChange={(e) => setRingSize(e.target.value)} className={fieldClass} />
              </div>
              <div className="sm:col-span-2">
                <label className={labelClass}>Preferences</label>
                <textarea
                  value={preferences}
                  onChange={(e) => setPreferences(e.target.value)}
                  className={fieldClass}
                  rows={2}
                />
              </div>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <Link href="/customers" className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center">
            Cancel
          </Link>
          <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
            {submitting ? "Saving…" : "Add Customer"}
          </button>
        </div>
      </form>
    </div>
  );
}
