import crypto from "crypto";

export const generateAppKey = (): Buffer => crypto.randomBytes(32);

export const rsaEncryptToBase64 = (
  value: string | Buffer,
  publicKeyPem: string,
): string => {
  const input = Buffer.isBuffer(value) ? value : Buffer.from(value, "utf8");
  const encrypted = crypto.publicEncrypt(
    {
      key: publicKeyPem,
      padding: crypto.constants.RSA_PKCS1_PADDING,
    },
    input,
  );
  return encrypted.toString("base64");
};

export const aesEncryptEcbToBase64 = (
  plainText: string,
  key: Buffer,
): string => {
  const cipher = crypto.createCipheriv("aes-256-ecb", key, null);
  cipher.setAutoPadding(true);
  return Buffer.concat([cipher.update(plainText, "utf8"), cipher.final()]).toString(
    "base64",
  );
};

export const aesDecryptEcbFromBase64 = (
  cipherTextBase64: string,
  key: Buffer,
): string => {
  const decipher = crypto.createDecipheriv("aes-256-ecb", key, null);
  decipher.setAutoPadding(true);
  const decrypted = Buffer.concat([
    decipher.update(cipherTextBase64, "base64"),
    decipher.final(),
  ]);
  return decrypted.toString("utf8");
};

export const decryptSessionKey = (
  encryptedSekBase64: string,
  appKey: Buffer,
): Buffer => {
  const decipher = crypto.createDecipheriv("aes-256-ecb", appKey, null);
  decipher.setAutoPadding(true);
  return Buffer.concat([
    decipher.update(encryptedSekBase64, "base64"),
    decipher.final(),
  ]);
};
