import { DEFAULT_BRANCH_ID } from "./constants.js";
import { prisma } from "../db.js";
import {
  assertBranchInOrganization,
  getOrganizationBranchIds,
  OrganizationAccessError,
} from "../organizations/access.js";
import type { UserRole } from "../../types.js";

export class BranchAccessError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 403,
  ) {
    super(message);
    this.name = "BranchAccessError";
  }
}

/** Each company's admin / head-office branch (not a shared global id). */
export const getOrganizationHeadOfficeBranchId = async (
  organizationId: string,
): Promise<string> => {
  const legacyHo = await prisma.branch.findFirst({
    where: { organizationId, id: DEFAULT_BRANCH_ID, active: true },
    select: { id: true },
  });
  if (legacyHo) return legacyHo.id;

  const namedHo = await prisma.branch.findFirst({
    where: {
      organizationId,
      active: true,
      name: { contains: "Head Office", mode: "insensitive" },
    },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (namedHo) return namedHo.id;

  const first = await prisma.branch.findFirst({
    where: { organizationId, active: true },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!first) {
    throw new OrganizationAccessError("No branch available for this company.", 404);
  }
  return first.id;
};

export const getUserBranchIds = async (
  userId: string,
  organizationId: string,
): Promise<string[]> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: true },
  });

  const ids = new Set<string>();
  if (user?.defaultBranchId) {
    await assertBranchInOrganization(user.defaultBranchId, organizationId);
    ids.add(user.defaultBranchId);
  }
  for (const ub of user?.branches ?? []) {
    await assertBranchInOrganization(ub.branchId, organizationId);
    ids.add(ub.branchId);
  }
  return [...ids];
};

export const getUserBranch = async (
  userId: string,
  organizationId: string,
  role?: UserRole,
): Promise<string> => {
  const branchIds = await getUserBranchIds(userId, organizationId);

  if (branchIds.length > 0) {
    return branchIds[0];
  }

  // Admins may operate without explicit branch assignment (head office fallback)
  if (role === "Admin" || role === "SuperAdmin") {
    return getOrganizationHeadOfficeBranchId(organizationId);
  }

  throw new BranchAccessError(
    "No branch assigned to your account. Contact an administrator.",
  );
};

export const assertUserHasBranchAccess = async (
  userId: string,
  organizationId: string,
  branchId: string,
  role: UserRole,
): Promise<void> => {
  if (role === "Admin" || role === "SuperAdmin") return;

  const branchIds = await getUserBranchIds(userId, organizationId);
  if (!branchIds.includes(branchId)) {
    throw new BranchAccessError("You do not have access to this branch.");
  }
};

export const getBranchScope = async (
  userId: string,
  role: UserRole,
  organizationId: string,
): Promise<string | undefined> => {
  if (role === "Admin" || role === "SuperAdmin") return undefined;
  return getUserBranch(userId, organizationId, role);
};

export const organizationBranchFilter = (
  organizationId: string,
  branchId?: string,
) =>
  branchId
    ? { branchId, branch: { organizationId } }
    : { branch: { organizationId } };

export const organizationTransferFromFilter = (
  organizationId: string,
  fromBranchId?: string,
) =>
  fromBranchId
    ? { fromBranchId, fromBranch: { organizationId } }
    : { fromBranch: { organizationId } };

export const organizationTransferToFilter = (
  organizationId: string,
  toBranchId: string,
) => ({
  toBranchId,
  toBranch: { organizationId },
});
