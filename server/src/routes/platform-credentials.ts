import { Router } from "express";
import { canManageOrganizations } from "../lib/auth/permissions.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  listProvisionedCredentials,
  ProvisionedCredentialsError,
  revealProvisionedPassword,
} from "../lib/users/provisioned-password.js";
import { routeParam } from "../lib/route-param.js";

export const platformCredentialsRouter = Router();

platformCredentialsRouter.use(authenticate);
platformCredentialsRouter.use(requireRole(canManageOrganizations));

platformCredentialsRouter.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const entries = await listProvisionedCredentials({
      role: req.user!.role,
    });
    res.json({ entries });
  } catch (error) {
    console.error("GET /api/platform/credentials", error);
    res.status(500).json({ error: "Failed to load credential vault." });
  }
});

platformCredentialsRouter.get(
  "/users/:userId/provisioned-password",
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await revealProvisionedPassword(
        {
          id: req.user!.id,
          role: req.user!.role,
          name: req.user!.name,
        },
        routeParam(req.params.userId),
      );
      res.json(result);
    } catch (error) {
      if (error instanceof ProvisionedCredentialsError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/platform/credentials/users/:userId/provisioned-password", error);
      res.status(500).json({ error: "Failed to load provisioned password." });
    }
  },
);