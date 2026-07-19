export type EinvoiceConfig = {
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  gstin: string;
  username: string;
  password: string;
  publicKeyPem: string;
};

const REQUIRED_KEYS = [
  "EINVOICE_NIC_BASE_URL",
  "EINVOICE_CLIENT_ID",
  "EINVOICE_CLIENT_SECRET",
  "EINVOICE_GSTIN",
  "EINVOICE_USERNAME",
  "EINVOICE_PASSWORD",
  "EINVOICE_NIC_PUBLIC_KEY",
] as const;

const normalizeBaseUrl = (url: string): string => {
  const trimmed = url.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) {
    throw new Error("EINVOICE_NIC_BASE_URL must start with http:// or https://");
  }
  return `${trimmed}/`;
};

const normalizePublicKey = (raw: string): string => {
  const trimmed = raw.trim();
  if (trimmed.includes("BEGIN PUBLIC KEY")) {
    return trimmed;
  }
  const body = trimmed.replace(/\s+/g, "");
  const wrapped = body.match(/.{1,64}/g)?.join("\n") ?? body;
  return `-----BEGIN PUBLIC KEY-----\n${wrapped}\n-----END PUBLIC KEY-----`;
};

const readConfigFromEnv = (): EinvoiceConfig | null => {
  const values = Object.fromEntries(
    REQUIRED_KEYS.map((key) => [key, process.env[key]?.trim() ?? ""]),
  ) as Record<(typeof REQUIRED_KEYS)[number], string>;

  const anySet = REQUIRED_KEYS.some((key) => values[key].length > 0);
  if (!anySet) return null;

  const missing = REQUIRED_KEYS.filter((key) => !values[key]);
  if (missing.length > 0) {
    throw new Error(
      `Incomplete e-Invoice configuration. Missing: ${missing.join(", ")}`,
    );
  }

  const gstin = values.EINVOICE_GSTIN.toUpperCase();
  if (!/^[0-9]{2}[0-9A-Z]{13}$/.test(gstin)) {
    throw new Error("EINVOICE_GSTIN must be a valid 15-character GSTIN.");
  }

  return {
    baseUrl: normalizeBaseUrl(values.EINVOICE_NIC_BASE_URL),
    clientId: values.EINVOICE_CLIENT_ID,
    clientSecret: values.EINVOICE_CLIENT_SECRET,
    gstin,
    username: values.EINVOICE_USERNAME,
    password: values.EINVOICE_PASSWORD,
    publicKeyPem: normalizePublicKey(values.EINVOICE_NIC_PUBLIC_KEY),
  };
};

let cachedConfig: EinvoiceConfig | null | undefined;

export const isEinvoiceConfigured = (): boolean => {
  try {
    return getEinvoiceConfig() !== null;
  } catch {
    return false;
  }
};

export const getEinvoiceConfig = (): EinvoiceConfig | null => {
  if (cachedConfig !== undefined) return cachedConfig;
  cachedConfig = readConfigFromEnv();
  return cachedConfig;
};

export const requireEinvoiceConfig = (): EinvoiceConfig => {
  const config = getEinvoiceConfig();
  if (!config) {
    throw new Error(
      "e-Invoice NIC integration is not configured. Set EINVOICE_NIC_BASE_URL, EINVOICE_CLIENT_ID, EINVOICE_CLIENT_SECRET, EINVOICE_GSTIN, EINVOICE_USERNAME, EINVOICE_PASSWORD, and EINVOICE_NIC_PUBLIC_KEY.",
    );
  }
  return config;
};

/** Validate env at startup — fails fast on partial configuration. */
export const validateEinvoiceEnvironment = (): void => {
  const partial = REQUIRED_KEYS.some((key) => Boolean(process.env[key]?.trim()));
  if (!partial) {
    console.info("[einvoice] NIC direct integration not configured (optional).");
    return;
  }

  const config = requireEinvoiceConfig();
  console.info(
    `[einvoice] NIC direct integration configured for GSTIN ${config.gstin} → ${config.baseUrl}`,
  );
};

/** @internal test helper */
export const resetEinvoiceConfigCache = (): void => {
  cachedConfig = undefined;
};
