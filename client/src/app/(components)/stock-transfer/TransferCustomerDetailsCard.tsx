"use client";

import { Building2, Mail, MapPin, Phone } from "lucide-react";
import type { ResolvedBranchBillingDetails } from "@/lib/customers/resolve-branch-details";

export type TransferBillingFormState = {
  gstNumber: string;
  panNumber: string;
  email: string;
  phone: string;
  address: string;
  placeOfSupplyState: string;
  placeOfSupplyStateCode: string;
  placeOfDeliveryState: string;
  placeOfDeliveryStateCode: string;
};

type TransferCustomerDetailsCardProps = {
  resolved: ResolvedBranchBillingDetails;
  form: TransferBillingFormState;
  warnings: string[];
  onChange: (field: keyof TransferBillingFormState, value: string) => void;
};

const labelClass = "text-[11px] font-medium uppercase tracking-wide text-zinc-400";
const inputClass = "input-field w-full px-3 py-2 text-sm";

export default function TransferCustomerDetailsCard({
  resolved,
  form,
  warnings,
  onChange,
}: TransferCustomerDetailsCardProps) {
  return (
    <div className="surface-card overflow-hidden">
      {warnings.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="border-b lg:border-b-0 lg:border-r border-zinc-100 p-5">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-zinc-100 p-2 text-zinc-600">
              <Building2 size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-zinc-500">{resolved.customerName}</p>
              <h3 className="text-base font-semibold text-zinc-900">
                {resolved.branchName}
              </h3>
              {resolved.gstRegisteredName &&
                resolved.gstRegisteredName !== resolved.branchName && (
                  <p className="mt-1 text-xs text-zinc-500">
                    {resolved.gstRegisteredName}
                  </p>
                )}
            </div>
          </div>

          <div className="mt-4 space-y-3">
            <div>
              <label className={labelClass}>Mobile / Phone</label>
              <div className="relative mt-1">
                <Phone
                  size={14}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400"
                />
                <input
                  type="text"
                  value={form.phone}
                  onChange={(event) => onChange("phone", event.target.value)}
                  className={`${inputClass} pl-9`}
                />
              </div>
            </div>

            <div>
              <label className={labelClass}>Address</label>
              <div className="relative mt-1">
                <MapPin
                  size={14}
                  className="absolute left-3 top-3 text-zinc-400"
                />
                <textarea
                  value={form.address}
                  onChange={(event) => onChange("address", event.target.value)}
                  rows={3}
                  className={`${inputClass} pl-9 resize-y min-h-[84px]`}
                />
              </div>
            </div>
          </div>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field
            label="GSTN"
            value={form.gstNumber}
            onChange={(value) => onChange("gstNumber", value)}
          />
          <Field
            label="State Code"
            value={form.placeOfSupplyStateCode}
            onChange={(value) => onChange("placeOfSupplyStateCode", value)}
          />
          <Field
            label="PAN"
            value={form.panNumber}
            onChange={(value) => onChange("panNumber", value)}
          />
          <Field
            label="Email"
            value={form.email}
            icon={<Mail size={14} className="text-zinc-400" />}
            onChange={(value) => onChange("email", value)}
          />

          <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-zinc-100">
            <div>
              <label className={labelClass}>Place of Supply</label>
              <input
                type="text"
                value={form.placeOfSupplyState}
                onChange={(event) =>
                  onChange("placeOfSupplyState", event.target.value)
                }
                className={`${inputClass} mt-1`}
              />
              <input
                type="text"
                value={form.placeOfSupplyStateCode}
                onChange={(event) =>
                  onChange("placeOfSupplyStateCode", event.target.value)
                }
                placeholder="State code"
                className={`${inputClass} mt-2`}
              />
            </div>
            <div>
              <label className={labelClass}>Place of Delivery</label>
              <input
                type="text"
                value={form.placeOfDeliveryState}
                onChange={(event) =>
                  onChange("placeOfDeliveryState", event.target.value)
                }
                className={`${inputClass} mt-1`}
              />
              <input
                type="text"
                value={form.placeOfDeliveryStateCode}
                onChange={(event) =>
                  onChange("placeOfDeliveryStateCode", event.target.value)
                }
                placeholder="State code"
                className={`${inputClass} mt-2`}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="relative mt-1">
        {icon && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
        )}
        <input
          type="text"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className={`${inputClass}${icon ? " pl-9" : ""}`}
        />
      </div>
    </div>
  );
}
