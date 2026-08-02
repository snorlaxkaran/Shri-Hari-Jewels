/** Normalize Indian mobile numbers to 10-digit string. */
export const normalizeIndianPhone = (raw: string): string | null => {
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 10) return digits;
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return null;
};

export const phoneToLoginEmail = (phone: string): string =>
  `${normalizeIndianPhone(phone) ?? phone}@shreehari.com`;

export const phoneToOrgSlug = (phone: string): string => {
  const digits = normalizeIndianPhone(phone) ?? phone.replace(/\D/g, "");
  return `jew-${digits}`;
};

/** Trial users keep a synthetic email until they pick a real login address. */
export const isPlaceholderTrialEmail = (email: string): boolean =>
  /^[0-9]{10}@shreehari\.com$/i.test(email.trim());

export const hasConfiguredLogin = (user: {
  email: string;
  credentialsConfigured: boolean;
}): boolean => user.credentialsConfigured && !isPlaceholderTrialEmail(user.email);
