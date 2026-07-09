import crypto from "node:crypto";
import { prisma } from "../db.js";

const REFRESH_TOKEN_DAYS = 7;

export const hashRefreshToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export const generateRefreshToken = (): string =>
  crypto.randomBytes(48).toString("base64url");

export const createRefreshToken = async (userId: string): Promise<string> => {
  const token = generateRefreshToken();
  const tokenHash = hashRefreshToken(token);
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + REFRESH_TOKEN_DAYS);

  await prisma.refreshToken.create({
    data: { userId, tokenHash, expiresAt },
  });

  return token;
};

export const revokeRefreshToken = async (token: string): Promise<void> => {
  const tokenHash = hashRefreshToken(token);
  await prisma.refreshToken.updateMany({
    where: { tokenHash, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const revokeAllUserRefreshTokens = async (userId: string): Promise<void> => {
  await prisma.refreshToken.updateMany({
    where: { userId, revokedAt: null },
    data: { revokedAt: new Date() },
  });
};

export const validateRefreshToken = async (
  token: string,
): Promise<{ userId: string } | null> => {
  const tokenHash = hashRefreshToken(token);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    return null;
  }
  return { userId: record.userId };
};

export const rotateRefreshToken = async (
  oldToken: string,
): Promise<{ userId: string; refreshToken: string } | null> => {
  const tokenHash = hashRefreshToken(oldToken);
  const record = await prisma.refreshToken.findUnique({
    where: { tokenHash },
  });
  if (!record || record.revokedAt || record.expiresAt < new Date()) {
    return null;
  }

  await prisma.refreshToken.update({
    where: { id: record.id },
    data: { revokedAt: new Date() },
  });

  const refreshToken = await createRefreshToken(record.userId);
  return { userId: record.userId, refreshToken };
};
