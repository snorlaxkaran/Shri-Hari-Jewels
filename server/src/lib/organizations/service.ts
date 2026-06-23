import { prisma } from "../db.js";
import { hashPassword } from "../auth/password.js";
import type { UserRole } from "../../types.js";

export class OrganizationError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "OrganizationError";
  }
}

export type OrganizationSummary = {
  id: string;
  name: string;
  slug: string;
  emailDomain: string | null;
  active: boolean;
  branchCount: number;
  userCount: number;
  adminEmail: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateOrganizationInput = {
  name: string;
  slug: string;
  emailDomain?: string;
  adminEmail: string;
  adminName: string;
  adminPassword: string;
};

export type UpdateOrganizationInput = {
  name?: string;
  slug?: string;
  emailDomain?: string | null;
  active?: boolean;
};

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

const toSummary = (org: {
  id: string;
  name: string;
  slug: string;
  emailDomain: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
  _count?: { branches: number; users: number };
  users?: Array<{ email: string }>;
}): OrganizationSummary => ({
  id: org.id,
  name: org.name,
  slug: org.slug,
  emailDomain: org.emailDomain,
  active: org.active,
  branchCount: org._count?.branches ?? 0,
  userCount: org._count?.users ?? 0,
  adminEmail: org.users?.[0]?.email ?? null,
  createdAt: org.createdAt.toISOString(),
  updatedAt: org.updatedAt.toISOString(),
});

export const listOrganizations = async (): Promise<OrganizationSummary[]> => {
  const orgs = await prisma.organization.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { branches: true, users: true } },
      users: {
        where: { role: "Admin" as UserRole, active: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { email: true },
      },
    },
  });
  return orgs.map(toSummary);
};

export const getOrganization = async (
  id: string,
): Promise<OrganizationSummary | null> => {
  const org = await prisma.organization.findUnique({
    where: { id },
    include: {
      _count: { select: { branches: true, users: true } },
      users: {
        where: { role: "Admin" as UserRole, active: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { email: true },
      },
    },
  });
  return org ? toSummary(org) : null;
};

export const createOrganization = async (
  input: CreateOrganizationInput,
): Promise<OrganizationSummary> => {
  const name = input.name.trim();
  const slug = slugify(input.slug || name);
  const adminEmail = input.adminEmail.trim().toLowerCase();
  const adminName = input.adminName.trim();
  const adminPassword = input.adminPassword;
  const emailDomain = input.emailDomain?.trim().toLowerCase() || null;

  if (!name) throw new OrganizationError("Company name is required.");
  if (!slug) throw new OrganizationError("Company slug is required.");
  if (!adminEmail.includes("@")) {
    throw new OrganizationError("Admin email must be a full email address.");
  }
  if (!adminName) throw new OrganizationError("Admin name is required.");
  if (!adminPassword || adminPassword.length < 6) {
    throw new OrganizationError("Admin password must be at least 6 characters.");
  }

  const existingSlug = await prisma.organization.findUnique({ where: { slug } });
  if (existingSlug) throw new OrganizationError("This company slug is already taken.");

  const existingEmail = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (existingEmail) throw new OrganizationError("Admin email is already in use.");

  const hashed = await hashPassword(adminPassword);

  const org = await prisma.$transaction(async (tx) => {
    const created = await tx.organization.create({
      data: {
        name,
        slug,
        emailDomain,
        active: true,
      },
    });

    const headOffice = await tx.branch.create({
      data: {
        organizationId: created.id,
        name: "Head Office",
        active: true,
      },
    });

    await tx.shopSettings.create({
      data: {
        organizationId: created.id,
        businessName: name,
      },
    });

    const admin = await tx.user.create({
      data: {
        organizationId: created.id,
        email: adminEmail,
        name: adminName,
        password: hashed,
        role: "Admin",
        active: true,
        defaultBranchId: headOffice.id,
        branches: {
          create: { branchId: headOffice.id },
        },
      },
    });

    return tx.organization.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        _count: { select: { branches: true, users: true } },
        users: {
          where: { id: admin.id },
          select: { email: true },
        },
      },
    });
  });

  return toSummary(org);
};

export const updateOrganization = async (
  id: string,
  input: UpdateOrganizationInput,
): Promise<OrganizationSummary> => {
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) throw new OrganizationError("Company not found.", 404);

  if (input.slug !== undefined) {
    const slug = slugify(input.slug);
    if (!slug) throw new OrganizationError("Company slug cannot be empty.");
    const conflict = await prisma.organization.findFirst({
      where: { slug, NOT: { id } },
    });
    if (conflict) throw new OrganizationError("This company slug is already taken.");
  }

  const org = await prisma.organization.update({
    where: { id },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.slug !== undefined && { slug: slugify(input.slug) }),
      ...(input.emailDomain !== undefined && {
        emailDomain: input.emailDomain?.trim().toLowerCase() || null,
      }),
      ...(input.active !== undefined && { active: input.active }),
    },
    include: {
      _count: { select: { branches: true, users: true } },
      users: {
        where: { role: "Admin" as UserRole, active: true },
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { email: true },
      },
    },
  });

  if (input.name !== undefined) {
    await prisma.shopSettings.updateMany({
      where: { organizationId: id },
      data: { businessName: input.name.trim() },
    });
  }

  return toSummary(org);
};

export const deleteOrganization = async (id: string): Promise<void> => {
  const existing = await prisma.organization.findUnique({ where: { id } });
  if (!existing) throw new OrganizationError("Company not found.", 404);

  await prisma.organization.delete({ where: { id } });
};
