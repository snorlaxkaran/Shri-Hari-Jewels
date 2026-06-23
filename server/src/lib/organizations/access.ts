import { prisma } from "../db.js";
import type { UserRole } from "../../types.js";

export class OrganizationAccessError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 403,
  ) {
    super(message);
    this.name = "OrganizationAccessError";
  }
}

export const isSuperAdminRole = (role: UserRole): boolean => role === "SuperAdmin";

export const getUserOrganizationId = async (userId: string): Promise<string | null> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { organizationId: true },
  });
  return user?.organizationId ?? null;
};

export const requireOrganizationId = async (
  userId: string,
  role: UserRole,
): Promise<string> => {
  if (isSuperAdminRole(role)) {
    throw new OrganizationAccessError(
      "Platform admin cannot access company ERP data directly.",
      403,
    );
  }

  const organizationId = await getUserOrganizationId(userId);
  if (!organizationId) {
    throw new OrganizationAccessError("No company assigned to this account.", 403);
  }

  return organizationId;
};

export const assertBranchInOrganization = async (
  branchId: string,
  organizationId: string,
): Promise<void> => {
  const branch = await prisma.branch.findFirst({
    where: { id: branchId, organizationId, active: true },
  });
  if (!branch) {
    throw new OrganizationAccessError("Branch not found in your company.", 404);
  }
};

export const getOrganizationBranchIds = async (
  organizationId: string,
): Promise<string[]> => {
  const branches = await prisma.branch.findMany({
    where: { organizationId, active: true },
    select: { id: true },
  });
  return branches.map((b) => b.id);
};
