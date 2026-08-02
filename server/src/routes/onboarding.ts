import { Router } from "express";
import { canManageOrganizations } from "../lib/auth/permissions.js";
import {
  completeOnboarding,
  dismissModuleOnboarding,
  getOnboardingStatus,
  saveSetupProfile,
  type SetupProfileInput,
} from "../lib/onboarding/service.js";
import { JEWELLERY_MODULES } from "../lib/onboarding/config.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const onboardingRouter = Router();

const parseProfile = (body: unknown): SetupProfileInput | null => {
  if (!body || typeof body !== "object") return null;
  const raw = body as Record<string, unknown>;
  const profile: SetupProfileInput = {};
  for (const key of [
    "implementingFor",
    "teamSize",
    "businessType",
    "currentSystem",
    "businessName",
    "gstNumber",
  ] as const) {
    if (typeof raw[key] === "string") profile[key] = raw[key];
  }
  if (Array.isArray(raw.enabledModules)) {
    profile.enabledModules = raw.enabledModules.filter((m) => typeof m === "string");
  }
  if (typeof raw.loadDemoData === "boolean") profile.loadDemoData = raw.loadDemoData;
  return profile;
};

onboardingRouter.get(
  "/status",
  authenticate,
  requireOrganization,
  async (req: AuthenticatedRequest, res) => {
    try {
      const status = await getOnboardingStatus(req.organizationId!);
      res.json(status);
    } catch (error) {
      console.error("GET /api/onboarding/status", error);
      res.status(500).json({ error: "Failed to fetch onboarding status." });
    }
  },
);

onboardingRouter.post(
  "/profile",
  authenticate,
  requireOrganization,
  requireRole(canManageOrganizations),
  async (req: AuthenticatedRequest, res) => {
    try {
      const parsed = parseProfile(req.body);
      if (!parsed) {
        res.status(400).json({ error: "Invalid setup profile." });
        return;
      }
      const status = await saveSetupProfile(
        req.organizationId!,
        parsed,
        req.user!.id,
      );
      res.json(status);
    } catch (error) {
      console.error("POST /api/onboarding/profile", error);
      res.status(500).json({ error: "Failed to save setup profile." });
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
      await completeOnboarding(req.organizationId!);
      res.json({ ok: true });
    } catch (error) {
      console.error("POST /api/onboarding/complete", error);
      res.status(500).json({ error: "Failed to complete onboarding." });
    }
  },
);

onboardingRouter.post(
  "/modules/:moduleId/dismiss",
  authenticate,
  requireOrganization,
  requireRole(canManageOrganizations),
  async (req: AuthenticatedRequest, res) => {
    try {
      const moduleId = String(req.params.moduleId ?? "");
      if (!(JEWELLERY_MODULES as readonly string[]).includes(moduleId)) {
        res.status(400).json({ error: "Unknown module." });
        return;
      }
      await dismissModuleOnboarding(
        req.organizationId!,
        moduleId as (typeof JEWELLERY_MODULES)[number],
      );
      res.json({ ok: true });
    } catch (error) {
      console.error("POST /api/onboarding/modules/:moduleId/dismiss", error);
      res.status(500).json({ error: "Failed to dismiss module onboarding." });
    }
  },
);
