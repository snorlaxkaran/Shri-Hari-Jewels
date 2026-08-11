import type { NextFunction, Response } from "express";
import { prisma } from "../db.js";
import {
  JEWELLERY_MODULES,
  type JewelleryModuleId,
  normalizeModules,
} from "../onboarding/config.js";
import type { AuthenticatedRequest } from "../../middleware/auth.js";

export class ModuleAccessError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 403,
    readonly moduleId?: JewelleryModuleId,
  ) {
    super(message);
    this.name = "ModuleAccessError";
  }
}

const moduleCache = new Map<string, { modules: JewelleryModuleId[]; expiresAt: number }>();
const CACHE_TTL_MS = 60_000;

export const getOrganizationModules = async (
  organizationId: string,
): Promise<JewelleryModuleId[]> => {
  const cached = moduleCache.get(organizationId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.modules;
  }

  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { enabledModules: true },
  });

  const modules = normalizeModules(org?.enabledModules ?? ["inventory", "sales"]);
  moduleCache.set(organizationId, { modules, expiresAt: Date.now() + CACHE_TTL_MS });
  return modules;
};

export const invalidateOrganizationModulesCache = (organizationId: string): void => {
  moduleCache.delete(organizationId);
};

export const organizationHasModule = async (
  organizationId: string,
  moduleId: JewelleryModuleId,
): Promise<boolean> => {
  const modules = await getOrganizationModules(organizationId);
  return modules.includes(moduleId);
};

/** Map API path prefixes to required module. More specific paths first. */
const PATH_MODULE_RULES: Array<{ prefix: string; module: JewelleryModuleId }> = [
  { prefix: "/api/inventory/transfers", module: "multibranch" },
  { prefix: "/api/storefront-admin", module: "storefront" },
  { prefix: "/api/designs", module: "production" },
  { prefix: "/api/motifs", module: "production" },
  { prefix: "/api/work-orders", module: "production" },
  { prefix: "/api/production-runs", module: "production" },
  { prefix: "/api/karigar", module: "production" },
  { prefix: "/api/stone-stock", module: "production" },
  { prefix: "/api/stone-types", module: "production" },
  { prefix: "/api/sales", module: "sales" },
  { prefix: "/api/orders", module: "sales" },
  { prefix: "/api/customers", module: "sales" },
  { prefix: "/api/repairs", module: "sales" },
  { prefix: "/api/invoices", module: "sales" },
  { prefix: "/api/credit-notes", module: "sales" },
  { prefix: "/api/debit-notes", module: "sales" },
  { prefix: "/api/leads", module: "sales" },
  { prefix: "/api/exchange", module: "sales" },
  { prefix: "/api/schemes", module: "sales" },
  { prefix: "/api/einvoice", module: "sales" },
  { prefix: "/api/inventory", module: "inventory" },
  { prefix: "/api/entry-vouchers", module: "inventory" },
  { prefix: "/api/raw-inventory", module: "inventory" },
  { prefix: "/api/hallmark-batches", module: "inventory" },
  { prefix: "/api/stock-audit", module: "inventory" },
  { prefix: "/api/catalog", module: "inventory" },
  { prefix: "/api/product-collections", module: "inventory" },
];

const MODULE_EXEMPT_PREFIXES = [
  "/api/billing",
  "/api/onboarding",
  "/api/settings",
  "/api/auth",
  "/api/branches",
  "/api/users",
  "/api/notifications",
  "/api/search",
];

export const getRequiredModuleForPath = (originalUrl: string): JewelleryModuleId | null => {
  const path = originalUrl.split("?")[0] ?? originalUrl;
  if (MODULE_EXEMPT_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    return null;
  }
  for (const rule of PATH_MODULE_RULES) {
    if (path.startsWith(rule.prefix)) {
      return rule.module;
    }
  }
  return null;
};

export const requireModule =
  (...moduleIds: JewelleryModuleId[]) =>
  async (req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> => {
    if (!req.organizationId) {
      res.status(403).json({ error: "Organization access required." });
      return;
    }

    try {
      const enabled = await getOrganizationModules(req.organizationId);
      if (moduleIds.some((id) => enabled.includes(id))) {
        next();
        return;
      }
      res.status(403).json({
        error: "module_not_enabled",
        message: "This feature is not included in your plan. Enable the module in Billing settings.",
        requiredModules: moduleIds,
      });
    } catch (error) {
      console.error("requireModule", error);
      res.status(500).json({ error: "Failed to verify module access." });
    }
  };

export const enforceModuleAccessForRequest = async (
  req: AuthenticatedRequest,
  res: Response,
): Promise<boolean> => {
  if (!req.organizationId || !req.user) return true;

  const required = getRequiredModuleForPath(req.originalUrl);
  if (!required) return true;

  const enabled = await getOrganizationModules(req.organizationId);
  if (enabled.includes(required)) return true;

  res.status(403).json({
    error: "module_not_enabled",
    message: `The "${required}" module is not enabled for your organization.`,
    requiredModule: required,
    enabledModules: enabled,
  });
  return false;
};

export const updateOrganizationModules = async (
  organizationId: string,
  modules: string[],
): Promise<JewelleryModuleId[]> => {
  const normalized = normalizeModules(modules);
  await prisma.$transaction(async (tx) => {
    await tx.organization.update({
      where: { id: organizationId },
      data: { enabledModules: normalized },
    });
    await tx.shopSettings.updateMany({
      where: { organizationId },
      data: { enabledModules: normalized },
    });
  });
  invalidateOrganizationModulesCache(organizationId);
  return normalized;
};

export const NAV_SECTION_MODULES: Record<string, JewelleryModuleId> = {
  Inventory: "inventory",
  "Stock transfer": "multibranch",
  Sales: "sales",
  Production: "production",
  "Online Store": "storefront",
};

export const isModuleEnabled = (
  enabledModules: JewelleryModuleId[],
  moduleId: JewelleryModuleId,
): boolean => enabledModules.includes(moduleId);

export { JEWELLERY_MODULES };
