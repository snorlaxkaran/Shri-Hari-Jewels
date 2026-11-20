import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const KEY_SALT = "shj-provisioned-pw-v1";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;

const deriveKey = (): Buffer => {
  const secret =
    process.env.PROVISIONED_PASSWORD_ENCRYPTION_KEY?.trim() ||
    process.env.JWT_SECRET?.trim() ||
    "dev-provisioned-password-key-change-in-production";
  return scryptSync(secret, KEY_SALT, 32);
};

export const encryptProvisionedPassword = (plaintext: string): string => {
  const key = deriveKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
};

export const decryptProvisionedPassword = (encoded: string): string => {
  const key = deriveKey();
  const payload = Buffer.from(encoded, "base64url");
  if (payload.length < IV_LENGTH + TAG_LENGTH + 1) {
    throw new Error("Invalid provisioned password payload.");
  }
  const iv = payload.subarray(0, IV_LENGTH);
  const tag = payload.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
  const ciphertext = payload.subarray(IV_LENGTH + TAG_LENGTH);
  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
};