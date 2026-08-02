import { prisma } from "../db.js";
import { hashPassword } from "../auth/password.js";

export class CredentialsError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "CredentialsError";
  }
}

export type SaveCredentialsInput = {
  email: string;
  password: string;
  name?: string;
};

export const saveLoginCredentials = async (
  userId: string,
  input: SaveCredentialsInput,
): Promise<{ email: string; name: string }> => {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new CredentialsError("User not found.", 404);
  }
  if (user.credentialsConfigured) {
    throw new CredentialsError("Login is already configured for this account.", 409);
  }

  const email = input.email.trim().toLowerCase();
  const name = input.name?.trim() || user.name;
  const password = input.password;

  if (!email || !email.includes("@") || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new CredentialsError("Enter a valid login email.");
  }
  if (!password || password.length < 6) {
    throw new CredentialsError("Password must be at least 6 characters.");
  }

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken && taken.id !== userId) {
    throw new CredentialsError("This email is already in use.");
  }

  const hashed = await hashPassword(password);
  const updated = await prisma.user.update({
    where: { id: userId },
    data: {
      email,
      name,
      password: hashed,
      credentialsConfigured: true,
    },
    select: { email: true, name: true },
  });

  return updated;
};
