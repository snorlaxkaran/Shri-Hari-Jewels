"use client";

import StatusBadge from "@/app/(components)/StatusBadge";
import type { Customer } from "@/lib/types";
import {
  isFieldDirty,
  type CustomerLookupFields,
} from "./types";

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type FoundCardProps = {
  customer: Customer;
  fields: CustomerLookupFields;
  originalFields: CustomerLookupFields;
  onChange: (fields: CustomerLookupFields) => void;
  onClear: () => void;
};

const FieldRow = ({
  label,
  value,
  onChange,
  dirty,
  required,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  dirty?: boolean;
  required?: boolean;
}) => (
  <div>
    <label className={labelClass}>
      {label}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={fieldClass}
      />
      {dirty && (
        <span
          className="text-xs text-amber-600 whitespace-nowrap shrink-0"
          title="Will update on sale"
        >
          ✏️
        </span>
      )}
    </div>
    {dirty && (
      <p className="text-[10px] text-amber-600 mt-0.5">will update on sale</p>
    )}
  </div>
);

export default function FoundCard({
  customer,
  fields,
  originalFields,
  onChange,
  onClear,
}: FoundCardProps) {
  const patch = (key: keyof CustomerLookupFields, value: string) => {
    onChange({ ...fields, [key]: value });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-emerald-700">✅ Customer Found</p>
        <button
          type="button"
          onClick={onClear}
          className="text-xs text-zinc-500 hover:text-zinc-800 underline"
        >
          Clear
        </button>
      </div>

      <div className="border-t border-zinc-200 pt-3 space-y-2">
        <FieldRow
          label="Name"
          value={fields.name}
          onChange={(v) => patch("name", v)}
          dirty={isFieldDirty("name", originalFields, fields)}
          required
        />
        <FieldRow
          label="Mobile"
          value={fields.mobile}
          onChange={(v) => patch("mobile", v)}
          dirty={isFieldDirty("mobile", originalFields, fields)}
        />
        <FieldRow
          label="Email"
          value={fields.email}
          onChange={(v) => patch("email", v)}
          dirty={isFieldDirty("email", originalFields, fields)}
        />
        <FieldRow
          label="GST No."
          value={fields.gstNumber}
          onChange={(v) => patch("gstNumber", v)}
          dirty={isFieldDirty("gstNumber", originalFields, fields)}
        />
        <FieldRow
          label="PAN"
          value={fields.panNumber}
          onChange={(v) => patch("panNumber", v)}
          dirty={isFieldDirty("panNumber", originalFields, fields)}
        />
        <FieldRow
          label="City"
          value={fields.billingCity}
          onChange={(v) => patch("billingCity", v)}
          dirty={isFieldDirty("billingCity", originalFields, fields)}
        />
      </div>

      <div className="flex items-center justify-end gap-2 text-xs text-zinc-500 pt-1">
        <span>Tier:</span>
        <StatusBadge status={customer.tier} />
        <span>·</span>
        <span>
          {customer.totalOrders} prev. order{customer.totalOrders === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
