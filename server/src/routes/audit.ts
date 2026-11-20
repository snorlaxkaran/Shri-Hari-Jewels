import { Router } from "express";
import { listAuditLogs } from "../lib/audit/service.js";
import { canViewOrganizationAudit } from "../lib/auth/permissions.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const auditRouter = Router();

auditRouter.get(
  "/",
  authenticate,
  requireOrganization,
  requireRole(canViewOrganizationAudit),
  async (req: AuthenticatedRequest, res) => {
    try {
      const entityType =
        typeof req.query.entityType === "string" ? req.query.entityType : undefined;
      const entityId =
        typeof req.query.entityId === "string" ? req.query.entityId : undefined;
      const action = typeof req.query.action === "string" ? req.query.action : undefined;
      const logs = await listAuditLogs({
        organizationId: req.organizationId,
        entityType,
        entityId,
        action,
        limit: 200,
      });
      res.json({ logs });
    } catch (error) {
      console.error("GET /api/audit", error);
      res.status(500).json({ error: "Failed to fetch audit logs." });
    }
  },
);
