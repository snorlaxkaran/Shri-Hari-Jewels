import { prisma } from "../db.js";
import { hashPassword } from "../auth/password.js";
import { isAuthenticatedRole, USER_ROLES } from "../auth/permissions.js";
import { writeAuditLog } from "../audit/service.js";
import type { UserRole } from "../../types.js";
import { getOrganizationHeadOfficeBranchId } from "../branches/access.js";

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

export const listUsers = async (organizationId: string): Promise<AppUser[]> => {
  const users = await prisma.user.findMany({
    where: { organizationId },
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

export const createUser = async (
  organizationId: string,
  input: CreateUserInput,
  actor?: { id?: string; name: string },
): Promise<AppUser> => {
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
  if (!isAuthenticatedRole(input.role) || input.role === "SuperAdmin") {
    throw new UserError("Role is not configured.");
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { emailDomain: true },
  });
  if (!org) throw new UserError("Company not found.", 404);

  const email = userId.includes("@")
    ? userId
    : org.emailDomain
      ? `${userId}@${org.emailDomain}`
      : `${userId}@shreehari.com`;

  const branchId =
    input.branchId ?? (await getOrganizationHeadOfficeBranchId(organizationId));

  if (!branchId) throw new UserError("No branch available for this company.", 404);

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new UserError("A user with this ID already exists.");

  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId },
  });
  if (!branch) throw new UserError("Branch not found.", 404);

  const hashed = await hashPassword(password);
  const user = await prisma.user.create({
    data: {
      organizationId,
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

  if (actor) {
    await writeAuditLog({
      organizationId,
      entityType: "User",
      entityId: user.id,
      action: "CREATED",
      after: { email: user.email, name: user.name, role: user.role },
      actor,
    });
  }

  return toAppUser(user);
};
