import { Router } from "express";
import {
  DiscountApprovalError,
  listPendingDiscountApprovals,
  resolveDiscountApproval,
} from "../lib/discount-approval/service.js";
import { canManageCustomers } from "../lib/auth/permissions.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { routeParam } from "../lib/route-param.js";
import { requireOrganization } from "../middleware/organization.js";

export const approvalsRouter = Router();

approvalsRouter.get(
  "/discounts",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const approvals = await listPendingDiscountApprovals(req.organizationId!);
      res.json({ approvals });
    } catch (error) {
      console.error("GET /api/approvals/discounts", error);
      res.status(500).json({ error: "Failed to fetch approvals." });
    }
  },
);

approvalsRouter.post(
  "/discounts/:id/approve",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const approval = await resolveDiscountApproval(
        routeParam(req.params.id),
        req.organizationId!,
        { id: req.user!.id, name: req.user!.name },
        true,
      );
      res.json({ approval: { id: approval.id, status: approval.status } });
    } catch (error) {
      if (error instanceof DiscountApprovalError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/approvals/discounts/:id/approve", error);
      res.status(500).json({ error: "Failed to approve discount." });
    }
  },
);

approvalsRouter.post(
  "/discounts/:id/reject",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const approval = await resolveDiscountApproval(
        routeParam(req.params.id),
        req.organizationId!,
        { id: req.user!.id, name: req.user!.name },
        false,
      );
      res.json({ approval: { id: approval.id, status: approval.status } });
    } catch (error) {
      if (error instanceof DiscountApprovalError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/approvals/discounts/:id/reject", error);
      res.status(500).json({ error: "Failed to reject discount." });
    }
  },
);
