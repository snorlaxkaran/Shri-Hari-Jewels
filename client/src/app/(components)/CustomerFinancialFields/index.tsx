"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type CustomerFinancialFormValues = {
  panNumber: string;
  gstNumber: string;
  gstRegisteredName: string;
  billingAddressLine1: string;
  billingAddressLine2: string;
  billingCity: string;
  billingState: string;
  billingPincode: string;
  billingCountry: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankIfsc: string;
  bankName: string;
};

export const emptyCustomerFinancialValues = (): CustomerFinancialFormValues => ({
  panNumber: "",
  gstNumber: "",
  gstRegisteredName: "",
  billingAddressLine1: "",
  billingAddressLine2: "",
  billingCity: "",
  billingState: "",
  billingPincode: "",
  billingCountry: "India",
  bankAccountName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankName: "",
});

const fieldClass = "input-field w-full px-3 py-2 text-sm";
const labelClass = "text-xs block mb-1 text-zinc-500 font-medium";

type FieldsProps = {
  values: CustomerFinancialFormValues;
  onChange: (values: CustomerFinancialFormValues) => void;
};

const useFieldSetter = (values: CustomerFinancialFormValues, onChange: FieldsProps["onChange"]) =>
  (key: keyof CustomerFinancialFormValues, value: string) => {
    onChange({ ...values, [key]: value });
  };

export function CustomerBillingAddressFields({ values, onChange }: FieldsProps) {
  const set = useFieldSetter(values, onChange);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div className="sm:col-span-2">
        <label className={labelClass}>Address Line 1</label>
        <input
          value={values.billingAddressLine1}
          onChange={(e) => set("billingAddressLine1", e.target.value)}
          className={fieldClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>Address Line 2</label>
        <input
          value={values.billingAddressLine2}
          onChange={(e) => set("billingAddressLine2", e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>City</label>
        <input
          value={values.billingCity}
          onChange={(e) => set("billingCity", e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>State</label>
        <input
          value={values.billingState}
          onChange={(e) => set("billingState", e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>Pincode</label>
        <input
          value={values.billingPincode}
          onChange={(e) => set("billingPincode", e.target.value)}
          placeholder="6 digits"
          maxLength={6}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>Country</label>
        <input
          value={values.billingCountry}
          onChange={(e) => set("billingCountry", e.target.value)}
          className={fieldClass}
        />
      </div>
    </div>
  );
}

export function CustomerTaxFields({ values, onChange }: FieldsProps) {
  const set = useFieldSetter(values, onChange);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>PAN</label>
        <input
          value={values.panNumber}
          onChange={(e) => set("panNumber", e.target.value.toUpperCase())}
          placeholder="AAAAA9999A"
          maxLength={10}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>GST Number</label>
        <input
          value={values.gstNumber}
          onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
          placeholder="15-character GSTIN"
          maxLength={15}
          className={fieldClass}
        />
      </div>
      <div className="sm:col-span-2">
        <label className={labelClass}>GST Registered Name</label>
        <input
          value={values.gstRegisteredName}
          onChange={(e) => set("gstRegisteredName", e.target.value)}
          placeholder="Legal name on GST registration"
          className={fieldClass}
        />
      </div>
    </div>
  );
}

export function CustomerBankFields({ values, onChange }: FieldsProps) {
  const set = useFieldSetter(values, onChange);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div>
        <label className={labelClass}>Account Holder Name</label>
        <input
          value={values.bankAccountName}
          onChange={(e) => set("bankAccountName", e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>Bank Name</label>
        <input
          value={values.bankName}
          onChange={(e) => set("bankName", e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>Account Number</label>
        <input
          value={values.bankAccountNumber}
          onChange={(e) => set("bankAccountNumber", e.target.value)}
          className={fieldClass}
        />
      </div>
      <div>
        <label className={labelClass}>IFSC</label>
        <input
          value={values.bankIfsc}
          onChange={(e) => set("bankIfsc", e.target.value.toUpperCase())}
          placeholder="AAAA0XXXXXX"
          maxLength={11}
          className={fieldClass}
        />
      </div>
    </div>
  );
}

export function CustomerTaxBankFields({ values, onChange }: FieldsProps) {
  return (
    <div className="space-y-4">
      <CustomerTaxFields values={values} onChange={onChange} />
      <div>
        <p className="text-xs font-medium text-zinc-600 mb-2">Bank Details</p>
        <CustomerBankFields values={values} onChange={onChange} />
      </div>
    </div>
  );
}

type CustomerFinancialFieldsProps = FieldsProps & {
  defaultOpen?: boolean;
};

export default function CustomerFinancialFields({
  values,
  onChange,
  defaultOpen = false,
}: CustomerFinancialFieldsProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-zinc-50 hover:bg-zinc-100 transition-colors"
      >
        <span className="text-xs font-medium text-zinc-600">
          Billing, Tax & Bank Details
          <span className="ml-1.5 font-normal text-zinc-400">(optional — for B2B)</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="p-4 space-y-4 border-t border-zinc-200">
          <CustomerTaxFields values={values} onChange={onChange} />
          <div>
            <p className="text-xs font-medium text-zinc-600 mb-2">Billing Address</p>
            <CustomerBillingAddressFields values={values} onChange={onChange} />
          </div>
          <div>
            <p className="text-xs font-medium text-zinc-600 mb-2">Bank Details</p>
            <CustomerBankFields values={values} onChange={onChange} />
          </div>
        </div>
      )}
    </div>
  );
}

type CollapsibleTaxBankProps = FieldsProps & {
  defaultOpen?: boolean;
};

export function CustomerTaxBankSectionCollapsible({
  values,
  onChange,
  defaultOpen = false,
}: CollapsibleTaxBankProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="border border-zinc-200 rounded-lg overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="w-full flex items-center justify-between px-3 py-2.5 text-left bg-zinc-50 hover:bg-zinc-100 transition-colors"
      >
        <span className="text-xs font-medium text-zinc-600">
          Tax & Banking
          <span className="ml-1.5 font-normal text-zinc-400">(optional — for B2B)</span>
        </span>
        <ChevronDown
          size={16}
          className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <div className="p-4 border-t border-zinc-200">
          <CustomerTaxBankFields values={values} onChange={onChange} />
        </div>
      )}
    </div>
  );
}

export const financialValuesFromCustomer = (
  customer: Partial<CustomerFinancialFormValues>,
): CustomerFinancialFormValues => ({
  panNumber: customer.panNumber ?? "",
  gstNumber: customer.gstNumber ?? "",
  gstRegisteredName: customer.gstRegisteredName ?? "",
  billingAddressLine1: customer.billingAddressLine1 ?? "",
  billingAddressLine2: customer.billingAddressLine2 ?? "",
  billingCity: customer.billingCity ?? "",
  billingState: customer.billingState ?? "",
  billingPincode: customer.billingPincode ?? "",
  billingCountry: customer.billingCountry ?? "India",
  bankAccountName: customer.bankAccountName ?? "",
  bankAccountNumber: customer.bankAccountNumber ?? "",
  bankIfsc: customer.bankIfsc ?? "",
  bankName: customer.bankName ?? "",
});

export const financialValuesToInput = (values: CustomerFinancialFormValues) => ({
  panNumber: values.panNumber.trim() || undefined,
  gstNumber: values.gstNumber.trim() || undefined,
  gstRegisteredName: values.gstRegisteredName.trim() || undefined,
  billingAddressLine1: values.billingAddressLine1.trim() || undefined,
  billingAddressLine2: values.billingAddressLine2.trim() || undefined,
  billingCity: values.billingCity.trim() || undefined,
  billingState: values.billingState.trim() || undefined,
  billingPincode: values.billingPincode.trim() || undefined,
  billingCountry: values.billingCountry.trim() || undefined,
  bankAccountName: values.bankAccountName.trim() || undefined,
  bankAccountNumber: values.bankAccountNumber.trim() || undefined,
  bankIfsc: values.bankIfsc.trim() || undefined,
  bankName: values.bankName.trim() || undefined,
});

export const financialValuesToUpdateInput = (values: CustomerFinancialFormValues) => ({
  panNumber: values.panNumber.trim() || null,
  gstNumber: values.gstNumber.trim() || null,
  gstRegisteredName: values.gstRegisteredName.trim() || null,
  billingAddressLine1: values.billingAddressLine1.trim() || null,
  billingAddressLine2: values.billingAddressLine2.trim() || null,
  billingCity: values.billingCity.trim() || null,
  billingState: values.billingState.trim() || null,
  billingPincode: values.billingPincode.trim() || null,
  billingCountry: values.billingCountry.trim() || null,
  bankAccountName: values.bankAccountName.trim() || null,
  bankAccountNumber: values.bankAccountNumber.trim() || null,
  bankIfsc: values.bankIfsc.trim() || null,
  bankName: values.bankName.trim() || null,
});

export const hasCustomerFinancialData = (
  customer: Partial<CustomerFinancialFormValues>,
): boolean =>
  Boolean(
    customer.panNumber ||
      customer.gstNumber ||
      customer.gstRegisteredName ||
      customer.billingAddressLine1 ||
      customer.billingAddressLine2 ||
      customer.billingCity ||
      customer.billingState ||
      customer.billingPincode ||
      customer.bankAccountName ||
      customer.bankAccountNumber ||
      customer.bankIfsc ||
      customer.bankName,
  );

export const formatCustomerBillingAddress = (
  customer: Partial<CustomerFinancialFormValues>,
): string | null => {
  const parts = [
    customer.billingAddressLine1?.trim(),
    customer.billingAddressLine2?.trim(),
    [customer.billingCity?.trim(), customer.billingState?.trim()]
      .filter(Boolean)
      .join(", "),
    customer.billingPincode?.trim(),
    customer.billingCountry?.trim(),
  ].filter((part) => part && part.length > 0);

  return parts.length > 0 ? parts.join(", ") : null;
};
