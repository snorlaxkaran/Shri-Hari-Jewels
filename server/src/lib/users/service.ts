import { prisma } from "../db.js";
import { hashPassword } from "../auth/password.js";
import { isAuthenticatedRole, USER_ROLES } from "../auth/permissions.js";
import type { UserRole } from "../../types.js";
import { DEFAULT_BRANCH_ID } from "../branches/constants.js";

export class UserError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "UserError";
  }
}

export type AppUser = {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  active: boolean;
  defaultBranchId?: string;
  createdAt: string;
};

const toAppUser = (user: {
  id: string;
  email: string;
  name: string;
  role: string;
  active: boolean;
  defaultBranchId: string | null;
  createdAt: Date;
}): AppUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  role: user.role as UserRole,
  active: user.active,
  defaultBranchId: user.defaultBranchId ?? undefined,
  createdAt: user.createdAt.toISOString(),
});

export const listUsers = async (): Promise<AppUser[]> => {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });
  return users.map(toAppUser);
};

export type CreateUserInput = {
  userId: string;
  name: string;
  password: string;
  role: UserRole;
  branchId?: string;
};

export const createUser = async (input: CreateUserInput): Promise<AppUser> => {
  const userId = input.userId.trim().toLowerCase();
  const name = input.name.trim();
  const password = input.password;

  if (!userId) throw new UserError("User ID is required.");
  if (!name) throw new UserError("Name is required.");
  if (!password || password.length < 6) {
    throw new UserError("Password must be at least 6 characters.");
  }
  if (!USER_ROLES.includes(input.role)) {
    throw new UserError("Invalid role.");
  }
  if (!isAuthenticatedRole(input.role)) {
    throw new UserError("Role is not configured.");
  }

  const email = userId.includes("@") ? userId : `${userId}@shreehari.com`;
  const branchId = input.branchId ?? DEFAULT_BRANCH_ID;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new UserError("A user with this ID already exists.");

  const branch = await prisma.branch.findUnique({ where: { id: branchId } });
  if (!branch) throw new UserError("Branch not found.", 404);

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashed,
      role: input.role,
      active: true,
      defaultBranchId: branchId,
      branches: {
        create: { branchId },
      },
    },
  });

  return toAppUser(user);
};
