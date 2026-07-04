import type { Customer, CustomerBranch } from "../../types.js";
import {
  formatStructuredAddress,
  type StructuredAddress,
} from "../validation/india.js";

export type ResolvedBranchBillingDetails = {
  branchName: string;
  customerName: string;
  displayName: string;
  gstRegisteredName: string | null;
  address: string | null;
  gstNumber: string | null;
  state: string | null;
  stateCode: string | null;
  panNumber: string | null;
  email: string | null;
  phone: string | null;
  pincode: string | null;
};

const hasText = (value: string | null | undefined): value is string =>
  typeof value === "string" && value.trim().length > 0;

const pickString = (
  branchValue: string | null | undefined,
  customerValue: string | null | undefined,
): string | null => {
  if (hasText(branchValue)) return branchValue.trim();
  if (hasText(customerValue)) return customerValue.trim();
  return null;
};

export const getStateCodeFromGst = (
  gstNumber: string | null | undefined,
): string | null => {
  if (!hasText(gstNumber) || gstNumber.trim().length < 2) return null;
  return gstNumber.trim().slice(0, 2).toUpperCase();
};

const formatAddress = (address: StructuredAddress): string | null =>
  formatStructuredAddress(address);

export const resolveBranchBillingDetails = (
  customer: Pick<
    Customer,
    | "name"
    | "mobile"
    | "email"
    | "address"
    | "city"
    | "billingAddressLine1"
    | "billingAddressLine2"
    | "billingCity"
    | "billingState"
    | "billingPincode"
    | "billingCountry"
    | "panNumber"
    | "gstNumber"
    | "gstRegisteredName"
  >,
  branch: Pick<
    CustomerBranch,
    | "name"
    | "address"
    | "city"
    | "state"
    | "pincode"
    | "gstNumber"
    | "gstRegisteredName"
    | "panNumber"
    | "email"
    | "phone"
  >,
): ResolvedBranchBillingDetails => {
  const gstNumber = pickString(branch.gstNumber, customer.gstNumber);
  const gstRegisteredName = pickString(
    branch.gstRegisteredName,
    customer.gstRegisteredName,
  );
  const panNumber = pickString(branch.panNumber, customer.panNumber);
  const email = pickString(branch.email, customer.email);
  const phone = pickString(branch.phone, customer.mobile);
  const state = pickString(branch.state, customer.billingState);
  const pincode = pickString(branch.pincode, customer.billingPincode);

  const branchAddress = formatAddress({
    line1: branch.address,
    city: branch.city,
    state: branch.state,
    pincode: branch.pincode,
    country: "India",
  });

  const customerBillingAddress = formatAddress({
    line1: customer.billingAddressLine1,
    line2: customer.billingAddressLine2,
    city: customer.billingCity,
    state: customer.billingState,
    pincode: customer.billingPincode,
    country: customer.billingCountry ?? "India",
  });

  const customerAddress = formatAddress({
    line1: customer.address,
    city: customer.city,
    country: "India",
  });

  const address = branchAddress ?? customerBillingAddress ?? customerAddress;
  const stateCode = getStateCodeFromGst(gstNumber);

  return {
    branchName: branch.name,
    customerName: customer.name,
    displayName: gstRegisteredName ?? branch.name,
    gstRegisteredName,
    address,
    gstNumber,
    state,
    stateCode,
    panNumber,
    email,
    phone,
    pincode,
  };
};

export type TransferBillingSnapshot = {
  recipientGstNumber?: string;
  recipientGstRegisteredName?: string;
  recipientPanNumber?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  recipientAddress?: string;
  placeOfSupplyState?: string;
  placeOfSupplyStateCode?: string;
  placeOfDeliveryState?: string;
  placeOfDeliveryStateCode?: string;
};

export const toTransferBillingSnapshot = (
  resolved: ResolvedBranchBillingDetails,
  overrides: {
    placeOfSupplyState?: string;
    placeOfSupplyStateCode?: string;
    placeOfDeliveryState?: string;
    placeOfDeliveryStateCode?: string;
    recipientGstNumber?: string;
    recipientPanNumber?: string;
    recipientEmail?: string;
    recipientPhone?: string;
    recipientAddress?: string;
  } = {},
): TransferBillingSnapshot => ({
  recipientGstNumber: overrides.recipientGstNumber ?? resolved.gstNumber ?? undefined,
  recipientGstRegisteredName: resolved.gstRegisteredName ?? undefined,
  recipientPanNumber: overrides.recipientPanNumber ?? resolved.panNumber ?? undefined,
  recipientEmail: overrides.recipientEmail ?? resolved.email ?? undefined,
  recipientPhone: overrides.recipientPhone ?? resolved.phone ?? undefined,
  recipientAddress: overrides.recipientAddress ?? resolved.address ?? undefined,
  placeOfSupplyState:
    overrides.placeOfSupplyState ?? resolved.state ?? undefined,
  placeOfSupplyStateCode:
    overrides.placeOfSupplyStateCode ??
    resolved.stateCode ??
    undefined,
  placeOfDeliveryState:
    overrides.placeOfDeliveryState ?? resolved.state ?? undefined,
  placeOfDeliveryStateCode:
    overrides.placeOfDeliveryStateCode ??
    resolved.stateCode ??
    undefined,
});
