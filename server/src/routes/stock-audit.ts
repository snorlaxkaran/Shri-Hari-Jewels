import { Router } from "express";
import {
  canManageStockAudit,
  canViewStockAudit,
} from "../lib/auth/permissions.js";
import { InventoryError } from "../lib/inventory/service.js";
import {
  createStockAuditSession,
  closeStockAuditSession,
  getStockAuditSession,
  listStockAuditPendingItems,
  listStockAuditSessions,
  scanStockAuditItem,
} from "../lib/inventory/stock-audit-service.js";
import {
  parseStockAuditMetalGroup,
  STOCK_AUDIT_METAL_GROUPS,
} from "../lib/inventory/stock-audit-metal.js";
import { getUserBranch } from "../lib/branches/access.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { routeParam } from "../lib/route-param.js";
import type {
  CreateStockAuditSessionInput,
  ScanStockAuditInput,
  StockAuditMetalGroup,
} from "../types.js";

export const stockAuditRouter = Router();

stockAuditRouter.use(authenticate);
stockAuditRouter.use(attachOrganization);

const resolveBranchId = async (req: AuthenticatedRequest) =>
  getUserBranch(req.user!.id, req.organizationId!, req.user!.role);

const parseMetalGroupParam = (value: string): StockAuditMetalGroup => {
  const parsed = parseStockAuditMetalGroup(value);
  if (!parsed) {
    throw new InventoryError("Invalid metal group.", 400);
  }
  return parsed;
};

stockAuditRouter.get(
  "/metal-groups",
  requireRole(canViewStockAudit),
  (_req, res) => {
    res.json({ groups: STOCK_AUDIT_METAL_GROUPS });
  },
);

stockAuditRouter.get(
  "/sessions",
  requireRole(canViewStockAudit),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await resolveBranchId(req);
      const rawMetal =
        typeof req.query.metalGroup === "string" ? req.query.metalGroup : "";
      const metalGroup = rawMetal.trim()
        ? parseMetalGroupParam(rawMetal)
        : undefined;
      const sessions = await listStockAuditSessions(
        req.organizationId!,
        branchId,
        metalGroup,
      );
      res.json(sessions);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/stock-audit/sessions", error);
      res.status(500).json({ error: "Failed to list audit sessions." });
    }
  },
);

stockAuditRouter.post(
  "/sessions",
  requireRole(canManageStockAudit),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await resolveBranchId(req);
      const body = req.body as CreateStockAuditSessionInput;
      if (!body.metalGroup || !STOCK_AUDIT_METAL_GROUPS.includes(body.metalGroup)) {
        res.status(400).json({ error: "Choose Gold, Silver, or Alloy." });
        return;
      }
      const session = await createStockAuditSession(
        req.organizationId!,
        branchId,
        body.metalGroup,
        { id: req.user!.id, name: req.user!.name },
      );
      res.status(201).json(session);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/stock-audit/sessions", error);
      res.status(500).json({ error: "Failed to start audit session." });
    }
  },
);

stockAuditRouter.get(
  "/sessions/:id",
  requireRole(canViewStockAudit),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await resolveBranchId(req);
      const session = await getStockAuditSession(
        routeParam(req.params.id),
        req.organizationId!,
        branchId,
        {
          includeScans: req.query.includeScans === "true",
        },
      );
      if (!session) {
        res.status(404).json({ error: "Audit session not found." });
        return;
      }
      res.json(session);
    } catch (error) {
      console.error("GET /api/stock-audit/sessions/:id", error);
      res.status(500).json({ error: "Failed to fetch audit session." });
    }
  },
);

stockAuditRouter.get(
  "/sessions/:id/pending",
  requireRole(canViewStockAudit),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await resolveBranchId(req);
      const items = await listStockAuditPendingItems(
        routeParam(req.params.id),
        req.organizationId!,
        branchId,
      );
      res.json(items);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/stock-audit/sessions/:id/pending", error);
      res.status(500).json({ error: "Failed to fetch pending audit items." });
    }
  },
);

stockAuditRouter.post(
  "/sessions/:id/scan",
  requireRole(canManageStockAudit),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await resolveBranchId(req);
      const body = req.body as ScanStockAuditInput;
      const session = await scanStockAuditItem(
        routeParam(req.params.id),
        body.itemCode ?? "",
        req.organizationId!,
        branchId,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(session);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/stock-audit/sessions/:id/scan", error);
      res.status(500).json({ error: "Failed to scan item." });
    }
  },
);

stockAuditRouter.post(
  "/sessions/:id/close",
  requireRole(canManageStockAudit),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await resolveBranchId(req);
      const session = await closeStockAuditSession(
        routeParam(req.params.id),
        req.organizationId!,
        branchId,
      );
      res.json(session);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/stock-audit/sessions/:id/close", error);
      res.status(500).json({ error: "Failed to close audit session." });
    }
  },
);
