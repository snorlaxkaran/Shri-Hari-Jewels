import { prisma } from "../db.js";
import type { AuthUser, LoginInput } from "../../types.js";
import { isAuthenticatedRole } from "./permissions.js";
import { signToken } from "./jwt.js";
import { verifyPassword } from "./password.js";

export class AuthError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 401,
  ) {
    super(message);
    this.name = "AuthError";
  }
}

const resolveLoginEmail = (identifier: string): string => {
  if (identifier.includes("@")) return identifier;

  // Legacy short IDs default to shreehari.com for existing deployments
  return `${identifier}@shreehari.com`;
};

export const login = async (
  input: LoginInput,
): Promise<{ token: string; user: AuthUser }> => {
  const identifier = input.email.trim().toLowerCase();
  const password = input.password;

  if (!identifier || !password) {
    throw new AuthError("User ID and password are required.");
  }

  const email = resolveLoginEmail(identifier);

  const user = await prisma.user.findUnique({
    where: { email },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });
  if (!user || !user.active) {
    throw new AuthError("Invalid email or password.");
  }

  if (user.organization && !user.organization.active) {
    throw new AuthError("Your company account has been deactivated.");
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    throw new AuthError("Invalid email or password.");
  }

  if (!isAuthenticatedRole(user.role)) {
    throw new AuthError("User role is not configured.");
  }

  const authUser: AuthUser = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId ?? undefined,
    organizationName: user.organization?.name,
  };

  const token = signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId ?? undefined,
    organizationName: user.organization?.name,
  });

  return { token, user: authUser };
};

export const getUserById = async (id: string): Promise<AuthUser | null> => {
  const user = await prisma.user.findUnique({
    where: { id },
    include: { organization: { select: { id: true, name: true, active: true } } },
  });
  if (!user || !user.active || !isAuthenticatedRole(user.role)) return null;
  if (user.organization && !user.organization.active) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId ?? undefined,
    organizationName: user.organization?.name,
  };
};
