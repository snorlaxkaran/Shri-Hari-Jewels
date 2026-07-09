import crypto from "node:crypto";
import { generateSecret, generateURI, verify } from "otplib";

const TOTP_ENCRYPTION_KEY =
  process.env.TOTP_ENCRYPTION_KEY ??
  process.env.JWT_SECRET ??
  "dev-totp-key-change-in-production";

const getKey = (): Buffer =>
  crypto.createHash("sha256").update(TOTP_ENCRYPTION_KEY).digest();

export const generateTotpSecret = (): string => generateSecret();

export const encryptTotpSecret = (secret: string): string => {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(secret, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64");
};

export const decryptTotpSecret = (encrypted: string): string => {
  const buf = Buffer.from(encrypted, "base64");
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    "utf8",
  );
};

export const verifyTotpCode = async (secret: string, code: string): Promise<boolean> => {
  const result = await verify({ secret, token: code.replace(/\s/g, "") });
  return result.valid;
};

export const getTotpUri = (email: string, secret: string): string =>
  generateURI({ issuer: "Shri Hari Jewels ERP", label: email, secret });
