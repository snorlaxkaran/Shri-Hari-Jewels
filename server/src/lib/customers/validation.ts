import {
  validateGstIfPresent,
  validateIfscIfPresent,
  validatePanIfPresent,
  validatePincodeIfPresent,
} from "../validation/india.js";

export type CustomerFinancialFields = {
  panNumber?: string | null;
  gstNumber?: string | null;
  gstRegisteredName?: string | null;
  billingAddressLine1?: string | null;
  billingAddressLine2?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPincode?: string | null;
  billingCountry?: string | null;
  bankAccountName?: string | null;
  bankAccountNumber?: string | null;
  bankIfsc?: string | null;
  bankName?: string | null;
};

const trimOrNull = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

export const validateCustomerFinancialFields = (
  input: CustomerFinancialFields,
): CustomerFinancialFields => ({
  panNumber: validatePanIfPresent(input.panNumber),
  gstNumber: validateGstIfPresent(input.gstNumber),
  gstRegisteredName: trimOrNull(input.gstRegisteredName),
  billingAddressLine1: trimOrNull(input.billingAddressLine1),
  billingAddressLine2: trimOrNull(input.billingAddressLine2),
  billingCity: trimOrNull(input.billingCity),
  billingState: trimOrNull(input.billingState),
  billingPincode: validatePincodeIfPresent(input.billingPincode),
  billingCountry: trimOrNull(input.billingCountry) ?? "India",
  bankAccountName: trimOrNull(input.bankAccountName),
  bankAccountNumber: trimOrNull(input.bankAccountNumber),
  bankIfsc: validateIfscIfPresent(input.bankIfsc),
  bankName: trimOrNull(input.bankName),
});

export type CustomerBranchFinancialFields = {
  gstNumber?: string | null;
  gstRegisteredName?: string | null;
  panNumber?: string | null;
  pincode?: string | null;
};

export const validateCustomerBranchFinancialFields = (
  input: CustomerBranchFinancialFields,
): CustomerBranchFinancialFields => ({
  gstNumber: validateGstIfPresent(input.gstNumber),
  gstRegisteredName: trimOrNull(input.gstRegisteredName),
  panNumber: validatePanIfPresent(input.panNumber),
  pincode: validatePincodeIfPresent(input.pincode),
});
