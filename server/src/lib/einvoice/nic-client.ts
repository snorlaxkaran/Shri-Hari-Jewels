import type { EinvoiceConfig } from "./config.js";
import {
  aesDecryptEcbFromBase64,
  aesEncryptEcbToBase64,
  decryptSessionKey,
  generateAppKey,
  rsaEncryptToBase64,
} from "./nic-crypto.js";
import {
  EinvoiceError,
  formatNicErrorDetails,
  parseNicErrorDetails,
  type NicErrorDetail,
} from "./errors.js";
import type { Inv1Payload } from "./inv1-mapper.js";

type NicAuthResponse = {
  Status: string | number;
  Data?: string | Record<string, unknown> | null;
  ErrorDetails?: unknown;
  InfoDtls?: unknown;
};

type NicDataResponse = {
  Status: string | number;
  Data?: string | null;
  ErrorDetails?: unknown;
  InfoDtls?: unknown;
};

export type NicGenerateResult = {
  irn: string;
  ackNo: string;
  ackDate: Date;
  signedQrCode: string;
  signedInvoice?: string;
  status: string;
};

export type NicCancelReason = "1" | "2" | "3" | "4";

type SessionCache = {
  authToken: string;
  sek: Buffer;
  expiresAt: number;
};

let sessionCache: SessionCache | null = null;

const isSuccessStatus = (status: string | number | undefined): boolean =>
  status === 1 || status === "1";

const parseJsonBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new EinvoiceError(
      `NIC API returned non-JSON response (${response.status}).`,
      "NIC_HTTP",
    );
  }
};

const decodeDataPayload = <T>(data: string, sek: Buffer): T => {
  const decrypted = aesDecryptEcbFromBase64(data, sek);
  return JSON.parse(decrypted) as T;
};

const encodeDataPayload = (payload: unknown, sek: Buffer): string =>
  aesEncryptEcbToBase64(JSON.stringify(payload), sek);

const nicHeaders = (
  config: EinvoiceConfig,
  authToken: string,
): Record<string, string> => ({
  "Content-Type": "application/json",
  client_id: config.clientId,
  client_secret: config.clientSecret,
  Gstin: config.gstin,
  user_name: config.username,
  AuthToken: authToken,
});

const throwNicFailure = (
  label: string,
  body: NicAuthResponse | NicDataResponse,
): never => {
  const details = parseNicErrorDetails(body.ErrorDetails);
  const message = formatNicErrorDetails(details);
  throw new EinvoiceError(`${label}: ${message}`, "NIC_REJECTED", details);
};

export const clearNicSessionCache = (): void => {
  sessionCache = null;
};

export const authenticateNicSession = async (
  config: EinvoiceConfig,
  forceRefresh = false,
): Promise<SessionCache> => {
  if (
    !forceRefresh &&
    sessionCache &&
    Date.now() < sessionCache.expiresAt - 5 * 60 * 1000
  ) {
    return sessionCache;
  }

  const appKey = generateAppKey();
  const authPayload = {
    UserName: config.username,
    Password: rsaEncryptToBase64(config.password, config.publicKeyPem),
    AppKey: rsaEncryptToBase64(appKey, config.publicKeyPem),
    ForceRefreshAccessToken: forceRefresh,
  };

  const response = await fetch(`${config.baseUrl}eivital/v1.04/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(authPayload),
  });

  const body = (await parseJsonBody(response)) as NicAuthResponse;
  if (!response.ok || !isSuccessStatus(body.Status)) {
    throwNicFailure("NIC authentication failed", body);
  }

  let data: Record<string, unknown>;
  if (typeof body.Data === "string") {
    data = decodeDataPayload<Record<string, unknown>>(body.Data, appKey);
  } else if (body.Data && typeof body.Data === "object") {
    data = body.Data;
  } else {
    throw new EinvoiceError("NIC authentication returned empty data.", "NIC_AUTH");
  }

  const authToken = String(data.AuthToken ?? "");
  const sekEncrypted = String(data.Sek ?? "");
  const tokenExpiryRaw = String(data.TokenExpiry ?? "");

  if (!authToken || !sekEncrypted) {
    throw new EinvoiceError("NIC authentication missing token or SEK.", "NIC_AUTH");
  }

  const sek = decryptSessionKey(sekEncrypted, appKey);
  const expiresAt = tokenExpiryRaw
    ? Date.parse(tokenExpiryRaw.replace(" ", "T"))
    : Date.now() + 55 * 60 * 1000;

  sessionCache = {
    authToken,
    sek,
    expiresAt: Number.isFinite(expiresAt) ? expiresAt : Date.now() + 55 * 60 * 1000,
  };
  return sessionCache;
};

const postEncryptedNic = async <T>(
  config: EinvoiceConfig,
  path: string,
  payload: unknown,
): Promise<T> => {
  const session = await authenticateNicSession(config);
  const response = await fetch(`${config.baseUrl}${path}`, {
    method: "POST",
    headers: nicHeaders(config, session.authToken),
    body: JSON.stringify({ Data: encodeDataPayload(payload, session.sek) }),
  });

  const body = (await parseJsonBody(response)) as NicDataResponse;
  if (!response.ok || !isSuccessStatus(body.Status)) {
    throwNicFailure("NIC request failed", body);
  }
  if (!body.Data) {
    throw new EinvoiceError("NIC API returned empty success payload.", "NIC_EMPTY");
  }

  return decodeDataPayload<T>(body.Data, session.sek);
};

const parseAckDate = (value: string): Date => {
  const normalized = value.trim().replace(" ", "T");
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) {
    throw new EinvoiceError(`Invalid NIC AckDt: ${value}`, "NIC_ACK_DATE");
  }
  return parsed;
};

export const generateNicIrn = async (
  config: EinvoiceConfig,
  payload: Inv1Payload,
): Promise<NicGenerateResult> => {
  const data = await postEncryptedNic<Record<string, unknown>>(
    config,
    "eicore/v1.03/Invoice",
    payload,
  );

  const irn = String(data.Irn ?? "");
  const ackNo = String(data.AckNo ?? "");
  const ackDateRaw = String(data.AckDt ?? "");
  const signedQrCode = String(data.SignedQRCode ?? "");

  if (!irn || !ackNo || !ackDateRaw || !signedQrCode) {
    throw new EinvoiceError(
      "NIC generate response missing IRN, AckNo, AckDt, or SignedQRCode.",
      "NIC_INCOMPLETE",
    );
  }

  return {
    irn,
    ackNo,
    ackDate: parseAckDate(ackDateRaw),
    signedQrCode,
    signedInvoice: data.SignedInvoice ? String(data.SignedInvoice) : undefined,
    status: String(data.Status ?? "ACT"),
  };
};

export const cancelNicIrn = async (
  config: EinvoiceConfig,
  input: { irn: string; reason: NicCancelReason; remarks?: string },
): Promise<{ irn: string; cancelDate: Date }> => {
  const payload = {
    Irn: input.irn,
    CnlRsn: input.reason,
    CnlRem: input.remarks?.trim().slice(0, 100) ?? "",
  };

  const data = await postEncryptedNic<Record<string, unknown>>(
    config,
    "eicore/v1.03/Invoice/Cancel",
    payload,
  );

  const irn = String(data.Irn ?? input.irn);
  const cancelDateRaw = String(data.CancelDate ?? "");
  return {
    irn,
    cancelDate: cancelDateRaw ? parseAckDate(cancelDateRaw) : new Date(),
  };
};

export const extractNicErrors = (error: unknown): NicErrorDetail[] => {
  if (error instanceof EinvoiceError) return error.details;
  return [];
};
