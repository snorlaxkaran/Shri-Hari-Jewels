import { DEFAULT_BRANCH_ID } from "./constants.js";
import { prisma } from "../db.js";
import {
  assertBranchInOrganization,
  getOrganizationBranchIds,
  OrganizationAccessError,
} from "../organizations/access.js";
import type { UserRole } from "../../types.js";

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

export const getUserBranch = async (
  userId: string,
  organizationId: string,
): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: { take: 1 } },
  });

  if (user?.defaultBranchId) {
    await assertBranchInOrganization(user.defaultBranchId, organizationId);
    return user.defaultBranchId;
  }

  if (user?.branches.length) {
    const branchId = user.branches[0].branchId;
    await assertBranchInOrganization(branchId, organizationId);
    return branchId;
  }

  const orgBranches = await getOrganizationBranchIds(organizationId);
  if (orgBranches.length > 0) {
    return getOrganizationHeadOfficeBranchId(organizationId);
  }

  throw new Error("No branch available for this company.");
};

export const getBranchScope = async (
  userId: string,
  role: UserRole,
  organizationId: string,
): Promise<string | undefined> => {
  if (role === "Admin") return undefined;
  return getUserBranch(userId, organizationId);
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
