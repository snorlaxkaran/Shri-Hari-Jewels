import { prisma } from "../db.js";

export class StorefrontError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "StorefrontError";
  }
}

export type ResolvedTenant = {
  organizationId: string;
  slug: string;
  name: string;
  active: boolean;
};

export const resolveTenantBySlug = async (
  slug: string,
): Promise<ResolvedTenant | null> => {
  const normalized = slug.trim().toLowerCase();
  if (!normalized) return null;

  const org = await prisma.organization.findUnique({
    where: { slug: normalized },
    select: { id: true, slug: true, name: true, active: true },
  });
  if (!org) return null;

  return {
    organizationId: org.id,
    slug: org.slug,
    name: org.name,
    active: org.active,
  };
};

export const resolveTenantByHost = async (
  host: string,
): Promise<ResolvedTenant | null> => {
  const normalized = host.trim().toLowerCase().split(":")[0];
  if (!normalized) return null;

  const byDomain = await prisma.organization.findFirst({
    where: { customDomain: normalized, active: true },
    select: { id: true, slug: true, name: true, active: true },
  });
  if (byDomain) {
    return {
      organizationId: byDomain.id,
      slug: byDomain.slug,
      name: byDomain.name,
      active: byDomain.active,
    };
  }

  const subdomainMatch = normalized.match(/^([a-z0-9-]+)\./);
  if (subdomainMatch?.[1] && subdomainMatch[1] !== "www") {
    return resolveTenantBySlug(subdomainMatch[1]);
  }

  return null;
};

export const requireActiveStorefront = async (
  organizationId: string,
): Promise<void> => {
  const settings = await prisma.storefrontSettings.findUnique({
    where: { organizationId },
    select: { enabled: true },
  });
  if (!settings?.enabled) {
    throw new StorefrontError("This online store is not available.", 404);
  }
};
