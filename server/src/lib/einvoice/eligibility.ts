import type { ShopSettings } from "../../types.js";
import { isEinvoiceConfigured } from "./config.js";

export type EinvoiceEligibilityInput = {
  settings: Pick<ShopSettings, "gstNumber" | "eInvoiceMandatory">;
  buyerGstNumber?: string | null;
};

export const isBuyerB2b = (buyerGstNumber?: string | null): boolean =>
  Boolean(buyerGstNumber?.trim());

export const isEinvoiceEligible = (input: EinvoiceEligibilityInput): boolean => {
  if (!isEinvoiceConfigured()) return false;
  if (!input.settings.gstNumber?.trim()) return false;
  if (!input.settings.eInvoiceMandatory) return false;
  return isBuyerB2b(input.buyerGstNumber);
};

export const describeEinvoiceSkipReason = (
  input: EinvoiceEligibilityInput,
): string | null => {
  if (!isEinvoiceConfigured()) {
    return "NIC e-Invoice credentials are not configured on the server.";
  }
  if (!input.settings.gstNumber?.trim()) {
    return "GST number not configured in shop settings.";
  }
  if (!input.settings.eInvoiceMandatory) {
    return "e-Invoice is not enabled for this organization (turnover threshold not flagged).";
  }
  if (!isBuyerB2b(input.buyerGstNumber)) {
    return "Buyer does not have a GSTIN — B2C invoices are not e-invoice eligible.";
  }
  return null;
};
