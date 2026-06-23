import { Router } from "express";
import {
  canViewDesigns,
} from "../lib/auth/permissions.js";
import { listCatalogAuditLogs } from "../lib/catalog/audit.js";
import type { CatalogEntityType } from "../lib/catalog/audit.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";

export const catalogRouter = Router();

catalogRouter.use(authenticate);
catalogRouter.use(attachOrganization);

catalogRouter.get(
  "/audit-log",
  requireRole(canViewDesigns),
  async (req, res) => {
    try {
      const entityType = req.query.entityType as CatalogEntityType | undefined;
      const entityId = req.query.entityId as string | undefined;
      const limit = req.query.limit
        ? parseInt(String(req.query.limit), 10)
        : 10;

      const logs = await listCatalogAuditLogs(entityType, entityId, limit);
      res.json(logs);
    } catch (error) {
      console.error("GET /api/catalog/audit-log", error);
      res.status(500).json({ error: "Failed to fetch catalog audit log" });
    }
  },
);
