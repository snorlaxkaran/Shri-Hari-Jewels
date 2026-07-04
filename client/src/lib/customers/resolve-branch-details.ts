import type { Customer, CustomerBranch } from "@/lib/types";

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

export type TransferBillingInput = {
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

const formatAddress = (parts: Array<string | null | undefined>): string | null => {
  const line1 = parts[0]?.trim();
  const line2 = parts[1]?.trim();
  const cityState = [parts[2]?.trim(), parts[3]?.trim()].filter(Boolean).join(", ");
  const pincode = parts[4]?.trim();
  const country = parts[5]?.trim();
  const joined = [line1, line2, cityState, pincode, country].filter(
    (part) => part && part.length > 0,
  );
  return joined.length > 0 ? joined.join(", ") : null;
};

export const getStateCodeFromGst = (
  gstNumber: string | null | undefined,
): string | null => {
  if (!hasText(gstNumber) || gstNumber.trim().length < 2) return null;
  return gstNumber.trim().slice(0, 2).toUpperCase();
};

export const resolveBranchBillingDetails = (
  customer: Customer,
  branch: CustomerBranch,
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

  const branchAddress = formatAddress([
    branch.address,
    null,
    branch.city,
    branch.state,
    branch.pincode,
    "India",
  ]);

  const customerBillingAddress = formatAddress([
    customer.billingAddressLine1,
    customer.billingAddressLine2,
    customer.billingCity,
    customer.billingState,
    customer.billingPincode,
    customer.billingCountry ?? "India",
  ]);

  const customerAddress = formatAddress([
    customer.address,
    null,
    customer.city,
    null,
    null,
    "India",
  ]);

  const address = branchAddress ?? customerBillingAddress ?? customerAddress;

  return {
    branchName: branch.name,
    customerName: customer.name,
    displayName: gstRegisteredName ?? branch.name,
    gstRegisteredName,
    address,
    gstNumber,
    state,
    stateCode: getStateCodeFromGst(gstNumber),
    panNumber,
    email,
    phone,
    pincode,
  };
};

export const toTransferBillingInput = (
  resolved: ResolvedBranchBillingDetails,
  overrides: {
    gstNumber?: string;
    panNumber?: string;
    email?: string;
    phone?: string;
    address?: string;
    placeOfSupplyState?: string;
    placeOfSupplyStateCode?: string;
    placeOfDeliveryState?: string;
    placeOfDeliveryStateCode?: string;
  },
): TransferBillingInput => ({
  recipientGstNumber: overrides.gstNumber ?? resolved.gstNumber ?? undefined,
  recipientGstRegisteredName: resolved.gstRegisteredName ?? undefined,
  recipientPanNumber: overrides.panNumber ?? resolved.panNumber ?? undefined,
  recipientEmail: overrides.email ?? resolved.email ?? undefined,
  recipientPhone: overrides.phone ?? resolved.phone ?? undefined,
  recipientAddress: overrides.address ?? resolved.address ?? undefined,
  placeOfSupplyState:
    overrides.placeOfSupplyState ?? resolved.state ?? undefined,
  placeOfSupplyStateCode:
    overrides.placeOfSupplyStateCode ?? resolved.stateCode ?? undefined,
  placeOfDeliveryState:
    overrides.placeOfDeliveryState ?? resolved.state ?? undefined,
  placeOfDeliveryStateCode:
    overrides.placeOfDeliveryStateCode ?? resolved.stateCode ?? undefined,
});

export const getTransferBillingWarnings = (
  documentType: "Wholesale GST Invoice" | "Delivery Challan",
  billing: TransferBillingInput,
): string[] => {
  const warnings: string[] = [];
  if (documentType === "Wholesale GST Invoice" && !billing.recipientGstNumber) {
    warnings.push(
      "GST number is missing on this branch and parent customer. Required for Wholesale GST Invoice.",
    );
  }
  if (documentType === "Wholesale GST Invoice" && !billing.recipientPanNumber) {
    warnings.push("PAN is missing on this branch and parent customer.");
  }
  if (!billing.recipientAddress) {
    warnings.push("Billing address is missing for this branch.");
  }
  return warnings;
};
