import { Router } from "express";
import { canManageSettings } from "../lib/auth/permissions.js";
import { getShopSettings, updateShopSettings } from "../lib/settings/service.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import type { UpdateShopSettingsInput } from "../types.js";

export const settingsRouter = Router();

settingsRouter.use(authenticate);
settingsRouter.use(attachOrganization);

settingsRouter.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await getShopSettings(req.organizationId!);
    res.json(settings);
  } catch (error) {
    console.error("GET /api/settings", error);
    res.status(500).json({ error: "Failed to fetch settings" });
  }
});

settingsRouter.patch(
  "/",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await updateShopSettings(
        req.organizationId!,
        req.body as UpdateShopSettingsInput,
      );
      res.json(settings);
    } catch (error) {
      console.error("PATCH /api/settings", error);
      const message =
        error instanceof Error ? error.message : "Failed to update settings";
      const status = message.includes("Invalid") ? 400 : 500;
      res.status(status).json({ error: message });
    }
  },
);
