const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const GST_REGEX =
  /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PINCODE_REGEX = /^[0-9]{6}$/;

export const normalizePan = (value: string): string => value.trim().toUpperCase();
export const normalizeGst = (value: string): string => value.trim().toUpperCase();
export const normalizeIfsc = (value: string): string => value.trim().toUpperCase();
export const normalizePincode = (value: string): string => value.trim();

export const isValidPan = (value: string): boolean =>
  PAN_REGEX.test(normalizePan(value));

export const isValidGst = (value: string): boolean =>
  GST_REGEX.test(normalizeGst(value));

export const isValidIfsc = (value: string): boolean =>
  IFSC_REGEX.test(normalizeIfsc(value));

export const isValidPincode = (value: string): boolean =>
  PINCODE_REGEX.test(normalizePincode(value));

export const validatePanIfPresent = (value: string | null | undefined): string | null => {
  if (value == null || !value.trim()) return null;
  const normalized = normalizePan(value);
  if (!isValidPan(normalized)) {
    throw new Error("Invalid PAN format. Expected AAAAA9999A.");
  }
  return normalized;
};

export const validateGstIfPresent = (value: string | null | undefined): string | null => {
  if (value == null || !value.trim()) return null;
  const normalized = normalizeGst(value);
  if (!isValidGst(normalized)) {
    throw new Error("Invalid GST number format.");
  }
  return normalized;
};

export const validateIfscIfPresent = (value: string | null | undefined): string | null => {
  if (value == null || !value.trim()) return null;
  const normalized = normalizeIfsc(value);
  if (!isValidIfsc(normalized)) {
    throw new Error("Invalid IFSC format. Expected AAAA0XXXXXX.");
  }
  return normalized;
};

export const validatePincodeIfPresent = (value: string | null | undefined): string | null => {
  if (value == null || !value.trim()) return null;
  const normalized = normalizePincode(value);
  if (!isValidPincode(normalized)) {
    throw new Error("Invalid pincode. Expected 6 digits.");
  }
  return normalized;
};

export type StructuredAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  pincode?: string | null;
  country?: string | null;
};

export const formatStructuredAddress = (address: StructuredAddress): string | null => {
  const parts = [
    address.line1?.trim(),
    address.line2?.trim(),
    [address.city?.trim(), address.state?.trim()].filter(Boolean).join(", "),
    address.pincode?.trim(),
    address.country?.trim(),
  ].filter((part) => part && part.length > 0);

  return parts.length > 0 ? parts.join(", ") : null;
};
