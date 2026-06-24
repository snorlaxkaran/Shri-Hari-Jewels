import type { Customer, UpdateCustomerInput } from "@/lib/types";

export type CustomerInputState =
  | "idle"
  | "searching"
  | "found"
  | "not_found"
  | "new_saved";

export type CustomerLookupFields = {
  name: string;
  mobile: string;
  email: string;
  gstNumber: string;
  panNumber: string;
  billingCity: string;
};

export type CustomerLookupSelection = {
  customerId: string;
  fields: CustomerLookupFields;
  dirtyFields: Partial<UpdateCustomerInput>;
};

export const emptyFields = (): CustomerLookupFields => ({
  name: "",
  mobile: "",
  email: "",
  gstNumber: "",
  panNumber: "",
  billingCity: "",
});

export const customerToFields = (customer: Customer): CustomerLookupFields => ({
  name: customer.name,
  mobile: customer.mobile,
  email: customer.email ?? "",
  gstNumber: customer.gstNumber ?? "",
  panNumber: customer.panNumber ?? "",
  billingCity: customer.billingCity ?? customer.city ?? "",
});

export const buildDirtyFields = (
  original: CustomerLookupFields,
  current: CustomerLookupFields,
): Partial<UpdateCustomerInput> => {
  const dirty: Partial<UpdateCustomerInput> = {};
  if (current.name !== original.name) dirty.name = current.name;
  if (current.mobile !== original.mobile) dirty.mobile = current.mobile;
  if (current.email !== original.email) {
    dirty.email = current.email.trim() || null;
  }
  if (current.gstNumber !== original.gstNumber) {
    dirty.gstNumber = current.gstNumber.trim() || null;
  }
  if (current.panNumber !== original.panNumber) {
    dirty.panNumber = current.panNumber.trim() || null;
  }
  if (current.billingCity !== original.billingCity) {
    dirty.billingCity = current.billingCity.trim() || null;
  }
  return dirty;
};

export const isFieldDirty = (
  field: keyof CustomerLookupFields,
  original: CustomerLookupFields,
  current: CustomerLookupFields,
): boolean => original[field] !== current[field];

export const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/i;

export const isLookupReady = (query: string): boolean => {
  const q = query.trim();
  if (q.length < 3) return false;
  if (GST_REGEX.test(q.toUpperCase())) return true;
  if (q.includes("@")) return true;
  if (/^\d{10}$/.test(q)) return true;
  if (/^\d+$/.test(q) && q.length < 10) return false;
  return true;
};
