import type { Branch } from "@/lib/types";

/** Head Office holds admin stock — not a valid destination for customer branch transfers. */
export const isHeadOfficeBranch = (branch: Pick<Branch, "id" | "name">): boolean =>
  branch.id === "head-office" ||
  /head\s*office/i.test(branch.name);

export const getStoreBranchesForTransfer = (branches: Branch[]): Branch[] =>
  branches.filter((branch) => branch.active && !isHeadOfficeBranch(branch));
