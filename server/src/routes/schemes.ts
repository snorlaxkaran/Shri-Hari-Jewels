import { Router } from "express";
import {
  createScheme,
  enrollCustomer,
  listEnrollments,
  listSchemes,
  recordInstallment,
} from "../lib/schemes/service.js";
import { canManageCustomers } from "../lib/auth/permissions.js";
import { getUserBranch } from "../lib/branches/access.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { routeParam } from "../lib/route-param.js";
import { requireOrganization } from "../middleware/organization.js";

export const schemesRouter = Router();

schemesRouter.get(
  "/",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const schemes = await listSchemes(req.organizationId!);
      res.json({ schemes });
    } catch (error) {
      console.error("GET /api/schemes", error);
      res.status(500).json({ error: "Failed to list schemes." });
    }
  },
);

schemesRouter.post(
  "/",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const scheme = await createScheme(req.organizationId!, {
        name: String(body.name ?? ""),
        description: typeof body.description === "string" ? body.description : undefined,
        durationMonths: Number(body.durationMonths ?? 12),
        monthlyAmount: Number(body.monthlyAmount ?? 0),
        bonusMonths: Number(body.bonusMonths ?? 1),
      });
      res.status(201).json({ id: scheme.id });
    } catch (error) {
      console.error("POST /api/schemes", error);
      res.status(500).json({ error: "Failed to create scheme." });
    }
  },
);

schemesRouter.get(
  "/enrollments",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const enrollments = await listEnrollments(req.organizationId!);
      res.json({ enrollments });
    } catch (error) {
      console.error("GET /api/schemes/enrollments", error);
      res.status(500).json({ error: "Failed to list enrollments." });
    }
  },
);

schemesRouter.post(
  "/enrollments",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const branchId = await getUserBranch(
        req.user!.id,
        req.organizationId!,
        req.user!.role,
      );
      const enrollment = await enrollCustomer({
        schemeId: String(body.schemeId ?? ""),
        customerId: String(body.customerId ?? ""),
        branchId,
      });
      res.status(201).json({ id: enrollment.id });
    } catch (error) {
      console.error("POST /api/schemes/enrollments", error);
      res.status(500).json({ error: "Failed to enroll customer." });
    }
  },
);

schemesRouter.post(
  "/enrollments/:id/installments",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      await recordInstallment({
        enrollmentId: routeParam(req.params.id),
        amount: Number(body.amount ?? 0),
        paymentMode: typeof body.paymentMode === "string" ? body.paymentMode : undefined,
        paymentRef: typeof body.paymentRef === "string" ? body.paymentRef : undefined,
        recordedByName: req.user!.name,
      });
      res.json({ ok: true });
    } catch (error) {
      console.error("POST /api/schemes/enrollments/:id/installments", error);
      res.status(500).json({ error: "Failed to record installment." });
    }
  },
);
