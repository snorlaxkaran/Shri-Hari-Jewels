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

export const login = async (
  input: LoginInput,
): Promise<{ token: string; user: AuthUser }> => {
  const identifier = input.email.trim().toLowerCase();
  const password = input.password;

  if (!identifier || !password) {
    throw new AuthError("User ID and password are required.");
  }

  const email = identifier.includes("@")
    ? identifier
    : `${identifier}@shreehari.com`;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.active) {
    throw new AuthError("Invalid email or password.");
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
  };

  const token = signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  });

  return { token, user: authUser };
};

export const getUserById = async (id: string): Promise<AuthUser | null> => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user || !user.active || !isAuthenticatedRole(user.role)) return null;

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };
};
