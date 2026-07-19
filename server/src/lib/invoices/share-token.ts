import crypto from "crypto";

const SHARE_SECRET =
  process.env.INVOICE_SHARE_SECRET ??
  process.env.JWT_SECRET ??
  "dev-jwt-secret-change-in-production";

const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60;

export type ShareDocumentKind = "invoice" | "transfer";

export type VerifiedShareToken = {
  kind: ShareDocumentKind;
  documentId: string;
};

const signPayload = (payload: string): string =>
  crypto.createHmac("sha256", SHARE_SECRET).update(payload).digest("base64url");

const encodeToken = (payload: string): string =>
  `${Buffer.from(payload, "utf8").toString("base64url")}.${signPayload(payload)}`;

export const createDocumentShareToken = (
  kind: ShareDocumentKind,
  documentId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): { token: string; expiresAt: Date } => {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${kind}.${documentId}.${exp}`;
  return { token: encodeToken(payload), expiresAt: new Date(exp * 1000) };
};

/** @deprecated Prefer createDocumentShareToken("invoice", id). */
export const createInvoiceShareToken = (
  invoiceId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): { token: string; expiresAt: Date } =>
  createDocumentShareToken("invoice", invoiceId, ttlSeconds);

export const verifyDocumentShareToken = (
  token: string,
): VerifiedShareToken | null => {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;

  const payloadB64 = token.slice(0, dot);
  const signature = token.slice(dot + 1);
  if (!payloadB64 || !signature) return null;

  let payload: string;
  try {
    payload = Buffer.from(payloadB64, "base64url").toString("utf8");
  } catch {
    return null;
  }

  const expected = signPayload(payload);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (
    sigBuf.length !== expectedBuf.length ||
    !crypto.timingSafeEqual(sigBuf, expectedBuf)
  ) {
    return null;
  }

  const parts = payload.split(".");
  const now = Math.floor(Date.now() / 1000);

  if (parts.length === 2) {
    const [documentId, expStr] = parts;
    const exp = Number(expStr);
    if (!documentId || !Number.isFinite(exp) || exp < now) return null;
    return { kind: "invoice", documentId };
  }

  if (parts.length === 3) {
    const [kind, documentId, expStr] = parts;
    if (kind !== "invoice" && kind !== "transfer") return null;
    const exp = Number(expStr);
    if (!documentId || !Number.isFinite(exp) || exp < now) return null;
    return { kind, documentId };
  }

  return null;
};

/** @deprecated Prefer verifyDocumentShareToken. */
export const verifyInvoiceShareToken = (
  token: string,
): { invoiceId: string } | null => {
  const verified = verifyDocumentShareToken(token);
  if (!verified || verified.kind !== "invoice") return null;
  return { invoiceId: verified.documentId };
};
