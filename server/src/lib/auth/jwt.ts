import jwt from "jsonwebtoken";
import type { UserRole } from "../../types.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production";
export const ACCESS_TOKEN_EXPIRES_IN = "30m";
export const TEMP_2FA_TOKEN_EXPIRES_IN = "5m";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
  type?: "access" | "temp_2fa";
};

export const signAccessToken = (payload: Omit<AuthTokenPayload, "type">): string =>
  jwt.sign({ ...payload, type: "access" }, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES_IN,
  });

export const signTemp2faToken = (payload: Omit<AuthTokenPayload, "type">): string =>
  jwt.sign({ ...payload, type: "temp_2fa" }, JWT_SECRET, {
    expiresIn: TEMP_2FA_TOKEN_EXPIRES_IN,
  });

/** @deprecated Use signAccessToken — kept for backward compatibility during migration */
export const signToken = signAccessToken;

export const verifyToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token");
  }
  const { sub, email, name, role, organizationId, organizationName, type } =
    decoded as AuthTokenPayload;
  if (!sub || !email || !name || !role) {
    throw new Error("Invalid token payload");
  }
  return { sub, email, name, role, organizationId, organizationName, type };
};

export const verifyAccessToken = (token: string): AuthTokenPayload => {
  const payload = verifyToken(token);
  if (payload.type === "temp_2fa") {
    throw new Error("2FA verification required");
  }
  return payload;
};

export const verifyTemp2faToken = (token: string): AuthTokenPayload => {
  const payload = verifyToken(token);
  if (payload.type !== "temp_2fa") {
    throw new Error("Invalid 2FA session");
  }
  return payload;
};
