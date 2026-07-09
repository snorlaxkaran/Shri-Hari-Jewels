import { Router } from "express";
import { prisma } from "../lib/db.js";
import { canManageOrganizations } from "../lib/auth/permissions.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const onboardingRouter = Router();

onboardingRouter.get(
  "/status",
  authenticate,
  requireOrganization,
  async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await prisma.shopSettings.findUnique({
        where: { organizationId: req.organizationId! },
        select: {
          businessName: true,
          gstNumber: true,
          onboardingCompletedAt: true,
        },
      });
      const branchCount = await prisma.branch.count({
        where: { organizationId: req.organizationId!, active: true },
      });
      const productCount = await prisma.product.count({
        where: { organizationId: req.organizationId! },
      });

      res.json({
        completed: settings?.onboardingCompletedAt != null,
        steps: {
          businessInfo: Boolean(settings?.businessName && settings.businessName !== "Jewellery Business"),
          gstConfigured: Boolean(settings?.gstNumber),
          branchCreated: branchCount > 0,
          openingStock: productCount > 0,
        },
      });
    } catch (error) {
      console.error("GET /api/onboarding/status", error);
      res.status(500).json({ error: "Failed to fetch onboarding status." });
    }
  },
);

onboardingRouter.post(
  "/complete",
  authenticate,
  requireOrganization,
  requireRole(canManageOrganizations),
  async (req: AuthenticatedRequest, res) => {
    try {
      await prisma.shopSettings.update({
        where: { organizationId: req.organizationId! },
        data: { onboardingCompletedAt: new Date() },
      });
      res.json({ ok: true });
    } catch (error) {
      console.error("POST /api/onboarding/complete", error);
      res.status(500).json({ error: "Failed to complete onboarding." });
    }
  },
);
