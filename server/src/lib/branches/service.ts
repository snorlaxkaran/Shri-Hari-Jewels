import { prisma } from "../db.js";
import type { Branch, NewBranchInput, UpdateBranchInput } from "../../types.js";

export class BranchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "BranchError";
  }
}

export const listBranches = async (organizationId: string): Promise<Branch[]> => {
  const branches = await prisma.branch.findMany({
    where: { organizationId, active: true },
    orderBy: { name: "asc" },
  });

  return branches.map(formatBranch);
};

export const getBranchDetail = async (
  id: string,
  organizationId: string,
): Promise<Branch | null> => {
  const branch = await prisma.branch.findFirst({
    where: { id, organizationId },
  });

  return branch ? formatBranch(branch) : null;
};

export const createBranch = async (
  organizationId: string,
  input: NewBranchInput,
): Promise<Branch> => {
  if (!input.name?.trim()) {
    throw new BranchError("Branch name is required");
  }

  const branch = await prisma.branch.create({
    data: {
      organizationId,
      name: input.name.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      manager: input.manager?.trim() || null,
      active: true,
    },
  });

  return formatBranch(branch);
};

export const updateBranch = async (
  id: string,
  organizationId: string,
  input: UpdateBranchInput,
): Promise<Branch> => {
  const branch = await prisma.branch.findFirst({
    where: { id, organizationId },
  });

  if (!branch) {
    throw new BranchError("Branch not found");
  }

  if (input.name?.trim() === "") {
    throw new BranchError("Branch name cannot be empty");
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      address: input.address?.trim() || null,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      manager: input.manager?.trim() || null,
      active: input.active,
    },
  });

  return formatBranch(updated);
};

export const deactivateBranch = async (
  id: string,
  organizationId: string,
): Promise<Branch> => {
  const branch = await prisma.branch.findFirst({
    where: { id, organizationId },
  });

  if (!branch) {
    throw new BranchError("Branch not found");
  }

  const updated = await prisma.branch.update({
    where: { id },
    data: { active: false },
  });

  return formatBranch(updated);
};

export const assignUserToBranch = async (
  userId: string,
  branchId: string,
  organizationId: string,
): Promise<void> => {
  const [user, branch] = await Promise.all([
    prisma.user.findFirst({ where: { id: userId, organizationId } }),
    prisma.branch.findFirst({ where: { id: branchId, organizationId } }),
  ]);

  if (!user) {
    throw new BranchError("User not found");
  }

  if (!branch) {
    throw new BranchError("Branch not found");
  }

  // Create or ignore if already exists
  await prisma.userBranch.upsert({
    where: { userId_branchId: { userId, branchId } },
    create: { userId, branchId },
    update: {},
  });
};

export const removeUserFromBranch = async (
  userId: string,
  branchId: string,
): Promise<void> => {
  await prisma.userBranch.delete({
    where: { userId_branchId: { userId, branchId } },
  });
};

export const getUserBranches = async (
  userId: string,
  organizationId: string,
): Promise<Branch[]> => {
  const userBranches = await prisma.userBranch.findMany({
    where: { userId, branch: { organizationId } },
    include: { branch: true },
  });

  return userBranches.map((ub) => formatBranch(ub.branch));
};

const formatBranch = (branch: any): Branch => ({
  id: branch.id,
  name: branch.name,
  address: branch.address,
  phone: branch.phone,
  email: branch.email,
  manager: branch.manager,
  active: branch.active,
  createdAt: branch.createdAt.toISOString(),
  updatedAt: branch.updatedAt.toISOString(),
});
