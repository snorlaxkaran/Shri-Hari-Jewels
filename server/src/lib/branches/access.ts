import { DEFAULT_BRANCH_ID } from "./constants.js";
import { prisma } from "../db.js";
import {
  assertBranchInOrganization,
  getOrganizationBranchIds,
} from "../organizations/access.js";
import type { UserRole } from "../../types.js";

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
  if (orgBranches.includes(DEFAULT_BRANCH_ID)) return DEFAULT_BRANCH_ID;
  if (orgBranches.length > 0) return orgBranches[0];

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

export const organizationBranchFilter = (organizationId: string, branchId?: string) =>
  branchId
    ? { branchId, branch: { organizationId } }
    : { branch: { organizationId } };
