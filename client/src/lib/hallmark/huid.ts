export const HUID_PATTERN = /^[A-Z0-9]{6}$/i;

export const normalizeHuid = (value: string): string =>
  value.trim().toUpperCase();

export const isValidHuid = (value: string): boolean =>
  HUID_PATTERN.test(normalizeHuid(value));
