import { prisma } from "../db.js";
import type {
  CustomerBranch,
  NewCustomerBranchInput,
  UpdateCustomerBranchInput,
} from "../../types.js";
import { CustomerError } from "./service.js";

const trimOrNull = (value: string | null | undefined): string | null => {
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const toCustomerBranch = (
  row: {
    id: string;
    customerId: string;
    branchId: string | null;
    name: string;
    address: string | null;
    city: string | null;
    state: string | null;
    pincode: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    linkedBranch?: { name: string } | null;
  },
): CustomerBranch => ({
  id: row.id,
  customerId: row.customerId,
  branchId: row.branchId ?? undefined,
  branchName: row.linkedBranch?.name,
  name: row.name,
  address: row.address ?? undefined,
  city: row.city ?? undefined,
  state: row.state ?? undefined,
  pincode: row.pincode ?? undefined,
  active: row.active,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const branchInclude = { linkedBranch: true } as const;

export const rankBranchQuery = (name: string, query: string): number => {
  const q = query.trim().toLowerCase();
  if (!q) return 0;

  const lower = name.toLowerCase();
  if (!lower.includes(q)) return -1;

  let score = 1000 - lower.indexOf(q);
  if (lower.startsWith(q)) score += 500;

  const words = lower.split(/\s+/);
  if (words.some((word) => word.startsWith(q))) score += 300;

  return score;
};

export const listCustomerBranches = async (
  customerId: string,
  organizationId: string,
  query?: string,
): Promise<CustomerBranch[]> => {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
  });
  if (!customer) throw new CustomerError("Customer not found.", 404);

  const branches = await prisma.customerBranch.findMany({
    where: {
      customerId,
      active: true,
      ...(query?.trim()
        ? {
            OR: [
              { name: { contains: query.trim(), mode: "insensitive" } },
              { city: { contains: query.trim(), mode: "insensitive" } },
              { address: { contains: query.trim(), mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: branchInclude,
    orderBy: { name: "asc" },
  });

  const mapped = branches.map(toCustomerBranch);
  const q = query?.trim();
  if (!q) return mapped;

  return mapped
    .map((branch) => ({ branch, score: rankBranchQuery(branch.name, q) }))
    .filter((entry) => entry.score >= 0)
    .sort((a, b) => b.score - a.score || a.branch.name.localeCompare(b.branch.name))
    .map((entry) => entry.branch);
};

export const createCustomerBranch = async (
  customerId: string,
  organizationId: string,
  input: NewCustomerBranchInput,
): Promise<CustomerBranch> => {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, organizationId },
  });
  if (!customer) throw new CustomerError("Customer not found.", 404);

  const name = input.name.trim();
  if (!name) throw new CustomerError("Branch name is required.");

  const branch = await prisma.customerBranch.create({
    data: {
      customerId,
      branchId: null,
      name,
      address: trimOrNull(input.address),
      city: trimOrNull(input.city),
      state: trimOrNull(input.state),
      pincode: trimOrNull(input.pincode),
    },
    include: branchInclude,
  });

  return toCustomerBranch(branch);
};

export const updateCustomerBranch = async (
  customerId: string,
  branchId: string,
  organizationId: string,
  input: UpdateCustomerBranchInput,
): Promise<CustomerBranch> => {
  const existing = await prisma.customerBranch.findFirst({
    where: {
      id: branchId,
      customerId,
      customer: { organizationId },
    },
  });
  if (!existing) throw new CustomerError("Customer branch not found.", 404);

  if (input.name !== undefined && !input.name.trim()) {
    throw new CustomerError("Branch name is required.");
  }

  const branch = await prisma.customerBranch.update({
    where: { id: branchId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.address !== undefined && { address: trimOrNull(input.address) }),
      ...(input.city !== undefined && { city: trimOrNull(input.city) }),
      ...(input.state !== undefined && { state: trimOrNull(input.state) }),
      ...(input.pincode !== undefined && { pincode: trimOrNull(input.pincode) }),
      ...(input.active !== undefined && { active: input.active }),
    },
    include: branchInclude,
  });

  return toCustomerBranch(branch);
};

export const deleteCustomerBranch = async (
  customerId: string,
  branchId: string,
  organizationId: string,
): Promise<void> => {
  const existing = await prisma.customerBranch.findFirst({
    where: {
      id: branchId,
      customerId,
      customer: { organizationId },
    },
  });
  if (!existing) throw new CustomerError("Customer branch not found.", 404);

  await prisma.customerBranch.update({
    where: { id: branchId },
    data: { active: false },
  });
};

export const resolveCustomerBranchForTransfer = async (
  customerId: string,
  customerBranchId: string,
  organizationId: string,
): Promise<{ customerBranch: CustomerBranch }> => {
  const customerBranch = await prisma.customerBranch.findFirst({
    where: {
      id: customerBranchId,
      customerId,
      active: true,
      customer: { organizationId },
    },
    include: branchInclude,
  });

  if (!customerBranch) {
    throw new CustomerError("Customer branch not found.", 404);
  }

  return {
    customerBranch: toCustomerBranch(customerBranch),
  };
};
