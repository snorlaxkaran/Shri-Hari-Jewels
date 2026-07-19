"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import type { Customer, UpdateCustomerInput } from "@/lib/types";
import { getApiErrorMessage } from "@/lib/api/client";
import { CUSTOMER_TYPES } from "@/lib/customers/constants";
import {
  CustomerBillingAddressFields,
  CustomerTaxBankSectionCollapsible,
  financialValuesFromCustomer,
  financialValuesToUpdateInput,
  hasCustomerFinancialData,
} from "@/app/(components)/CustomerFinancialFields";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

const toDateInput = (iso?: string) => (iso ? iso.slice(0, 10) : "");

type CustomerEditFormProps = {
  customer: Customer;
  cancelHref: string;
  onCancelClick?: () => void;
  onSubmit: (input: UpdateCustomerInput) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
};

export default function CustomerEditForm({
  customer,
  cancelHref,
  onCancelClick,
  onSubmit,
  onDirtyChange,
}: CustomerEditFormProps) {
  const [companyName, setCompanyName] = useState("");
  const [customerType, setCustomerType] = useState("Individual Buyer");
  const [ownerName, setOwnerName] = useState("");
  const [contactPersonName, setContactPersonName] = useState("");
  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [anniversary, setAnniversary] = useState("");
  const [ringSize, setRingSize] = useState("");
  const [preferences, setPreferences] = useState("");
  const [financial, setFinancial] = useState(financialValuesFromCustomer({}));
  const [personalOpen, setPersonalOpen] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    setCompanyName(customer.companyName ?? "");
    setCustomerType(customer.customerType ?? "Individual Buyer");
    setOwnerName(customer.ownerName ?? "");
    setContactPersonName(customer.contactPersonName ?? "");
    setName(customer.name);
    setMobile(customer.mobile);
    setEmail(customer.email ?? "");
    setBirthday(toDateInput(customer.birthday));
    setAnniversary(toDateInput(customer.anniversary));
    setRingSize(customer.ringSize ?? "");
    setPreferences(customer.preferences ?? "");
    setFinancial(financialValuesFromCustomer(customer));
    setPersonalOpen(false);
    setError("");
    setDirty(false);
  }, [customer]);

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  const markDirty = () => setDirty(true);

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
        companyName: companyName.trim() || null,
        customerType,
        ownerName: ownerName.trim() || null,
        contactPersonName: contactPersonName.trim() || null,
        email: email.trim() || null,
        birthday: birthday || null,
        anniversary: anniversary || null,
        ringSize: ringSize.trim() || null,
        preferences: preferences.trim() || null,
        ...financialValuesToUpdateInput(financial),
      });
      setDirty(false);
    } catch (err) {
      setError(getApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="form-layout">
      <div className="form-columns">
        <section className="form-section">
          <h2 className="section-title">Company / Business Info</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass}>Company Name</label>
              <input
                value={companyName}
                onChange={(e) => {
                  setCompanyName(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
                autoFocus
              />
            </div>
            <div>
              <label className={labelClass}>Customer Type *</label>
              <select
                value={customerType}
                onChange={(e) => {
                  setCustomerType(e.target.value);
                  markDirty();
                }}
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
                onChange={(e) => {
                  setOwnerName(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Primary Contact Person</label>
              <input
                value={contactPersonName}
                onChange={(e) => {
                  setContactPersonName(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Name *</label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Mobile *</label>
              <input
                value={mobile}
                onChange={(e) => {
                  setMobile(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              />
            </div>
          </div>
        </section>

        <div className="space-y-8">
          <section className="form-section">
            <h2 className="section-title">Billing & Financial Details</h2>
            <p className="form-section-note">Optional — used on tax invoices for B2B customers.</p>
            <CustomerBillingAddressFields
              values={financial}
              onChange={(next) => {
                setFinancial(next);
                markDirty();
              }}
            />
          </section>

          <section className="form-section">
            <CustomerTaxBankSectionCollapsible
              values={financial}
              onChange={(next) => {
                setFinancial(next);
                markDirty();
              }}
              defaultOpen={hasCustomerFinancialData(customer)}
            />
          </section>
        </div>
      </div>

      <section className="form-section">
        <button
          type="button"
          onClick={() => setPersonalOpen((prev) => !prev)}
          className="form-collapsible-trigger"
        >
          <span className="section-title">Personal Details (Optional)</span>
          <ChevronDown
            size={16}
            className={`text-zinc-400 transition-transform shrink-0 ${personalOpen ? "rotate-180" : ""}`}
          />
        </button>
        {personalOpen && (
          <div className="form-collapsible-body grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Birthday</label>
              <input
                type="date"
                value={birthday}
                onChange={(e) => {
                  setBirthday(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Anniversary</label>
              <input
                type="date"
                value={anniversary}
                onChange={(e) => {
                  setAnniversary(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              />
            </div>
            <div>
              <label className={labelClass}>Ring Size</label>
              <input
                value={ringSize}
                onChange={(e) => {
                  setRingSize(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>Preferences</label>
              <input
                value={preferences}
                onChange={(e) => {
                  setPreferences(e.target.value);
                  markDirty();
                }}
                className={fieldClass}
              />
            </div>
          </div>
        )}
      </section>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-3 max-w-md">
        {onCancelClick ? (
          <button type="button" onClick={onCancelClick} className="btn-secondary flex-1 px-4 py-2.5 text-sm">
            Cancel
          </button>
        ) : (
          <Link href={cancelHref} className="btn-secondary flex-1 px-4 py-2.5 text-sm text-center">
            Cancel
          </Link>
        )}
        <button type="submit" disabled={submitting} className="btn-primary flex-1 px-4 py-2.5 text-sm">
          {submitting ? "Saving…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}
