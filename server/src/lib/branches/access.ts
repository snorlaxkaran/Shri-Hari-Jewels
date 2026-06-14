import { DEFAULT_BRANCH_ID } from "./constants.js";
import { prisma } from "../db.js";
import type { UserRole } from "../../types.js";

export const getUserBranch = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: { take: 1 } },
  });

  if (user?.defaultBranchId) return user.defaultBranchId;
  if (user?.branches.length) return user.branches[0].branchId;
  return DEFAULT_BRANCH_ID;
};

export const getBranchScope = async (
  userId: string,
  role: UserRole,
): Promise<string | undefined> => {
  if (role === "Admin") return undefined;
  return getUserBranch(userId);
};
