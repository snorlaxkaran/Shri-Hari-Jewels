import crypto from "crypto";

const SHARE_SECRET =
  process.env.INVOICE_SHARE_SECRET ??
  process.env.JWT_SECRET ??
  "dev-jwt-secret-change-in-production";

const DEFAULT_TTL_SECONDS = 90 * 24 * 60 * 60;

const signPayload = (payload: string): string =>
  crypto.createHmac("sha256", SHARE_SECRET).update(payload).digest("base64url");

export const createInvoiceShareToken = (
  invoiceId: string,
  ttlSeconds = DEFAULT_TTL_SECONDS,
): { token: string; expiresAt: Date } => {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = `${invoiceId}.${exp}`;
  const token = `${Buffer.from(payload, "utf8").toString("base64url")}.${signPayload(payload)}`;
  return { token, expiresAt: new Date(exp * 1000) };
};

export const verifyInvoiceShareToken = (
  token: string,
): { invoiceId: string } | null => {
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

  const [invoiceId, expStr] = payload.split(".");
  const exp = Number(expStr);
  if (!invoiceId || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return null;
  }

  return { invoiceId };
};
