"use client";

import { isAxiosError } from "axios";
import { useState } from "react";
import { createCustomer } from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api/client";
import type { Customer } from "@/lib/types";
import { GST_REGEX, type CustomerLookupFields } from "./types";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type NewCustomerFormProps = {
  query: string;
  fields: CustomerLookupFields;
  onChange: (fields: CustomerLookupFields) => void;
  onSaved: (customer: Customer) => void;
  onLoadExisting: (mobile: string) => void;
};

const validateFields = (fields: CustomerLookupFields): string | null => {
  if (!fields.name.trim()) return "Customer name is required.";
  if (!fields.mobile.trim()) return "Mobile number is required.";
  if (!/^\d{10}$/.test(fields.mobile.trim())) {
    return "Mobile must be 10 digits.";
  }
  if (fields.gstNumber.trim() && !GST_REGEX.test(fields.gstNumber.trim().toUpperCase())) {
    return "Invalid GST number format.";
  }
  return null;
};

export default function NewCustomerForm({
  query,
  fields,
  onChange,
  onSaved,
  onLoadExisting,
}: NewCustomerFormProps) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [duplicateMobile, setDuplicateMobile] = useState<string | null>(null);

  const patch = (key: keyof CustomerLookupFields, value: string) => {
    onChange({ ...fields, [key]: value });
    setError("");
    setDuplicateMobile(null);
  };

  const handleSave = async () => {
    const validationError = validateFields(fields);
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");
    setDuplicateMobile(null);

    try {
      const customer = await createCustomer({
        name: fields.name.trim(),
        mobile: fields.mobile.trim(),
        email: fields.email.trim() || undefined,
        gstNumber: fields.gstNumber.trim() || undefined,
        panNumber: fields.panNumber.trim() || undefined,
        billingCity: fields.billingCity.trim() || undefined,
      });
      onSaved(customer);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        setDuplicateMobile(fields.mobile.trim());
        setError("A customer with this mobile already exists.");
        return;
      }
      setError(getApiErrorMessage(err, "Could not create customer."));
    } finally {
      setSaving(false);
    }
  };

  const searchLabel = query.includes("@")
    ? "email"
    : GST_REGEX.test(query.trim().toUpperCase())
      ? "GST number"
      : "number";

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-zinc-700">
        ➕ New Customer — no record found for this {searchLabel}
      </p>

      <div className="border-t border-zinc-200 pt-3 space-y-2">
        <div>
          <label className={labelClass}>
            Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={fields.name}
            onChange={(e) => patch("name", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Mobile</label>
          <input
            type="text"
            value={fields.mobile}
            onChange={(e) => patch("mobile", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Email</label>
          <input
            type="text"
            value={fields.email}
            onChange={(e) => patch("email", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>GST No.</label>
          <input
            type="text"
            value={fields.gstNumber}
            onChange={(e) => patch("gstNumber", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>PAN</label>
          <input
            type="text"
            value={fields.panNumber}
            onChange={(e) => patch("panNumber", e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>City</label>
          <input
            type="text"
            value={fields.billingCity}
            onChange={(e) => patch("billingCity", e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      {error && (
        <p className="text-xs text-red-500">
          {error}
          {duplicateMobile && (
            <>
              {" "}
              <button
                type="button"
                className="underline font-medium"
                onClick={() => onLoadExisting(duplicateMobile)}
              >
                Load their details
              </button>
            </>
          )}
        </p>
      )}

      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        className="btn-secondary w-full px-4 py-2 text-sm disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save & Use Customer"}
      </button>
    </div>
  );
}
