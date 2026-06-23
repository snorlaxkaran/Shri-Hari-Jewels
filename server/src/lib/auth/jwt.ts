import jwt from "jsonwebtoken";
import type { UserRole } from "../../types.js";

const JWT_SECRET = process.env.JWT_SECRET ?? "dev-jwt-secret-change-in-production";
const JWT_EXPIRES_IN = "7d";

export type AuthTokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId?: string;
  organizationName?: string;
};

export const signToken = (payload: AuthTokenPayload): string =>
  jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

export const verifyToken = (token: string): AuthTokenPayload => {
  const decoded = jwt.verify(token, JWT_SECRET);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid token");
  }
  const { sub, email, name, role, organizationId, organizationName } =
    decoded as AuthTokenPayload;
  if (!sub || !email || !name || !role) {
    throw new Error("Invalid token payload");
  }
  return { sub, email, name, role, organizationId, organizationName };
};
