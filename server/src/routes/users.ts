import { Router } from "express";
import { canManageSettings } from "../lib/auth/permissions.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { createUser, listUsers, UserError } from "../lib/users/service.js";
import {
  ProvisionedCredentialsError,
  revealProvisionedPassword,
  resetUserPasswordAsAdmin,
} from "../lib/users/provisioned-password.js";
import { routeParam } from "../lib/route-param.js";
import type { CreateUserInput, UserRole } from "../types.js";

export const usersRouter = Router();

usersRouter.use(authenticate);
usersRouter.use(attachOrganization);

usersRouter.get("/", requireRole(canManageSettings), async (req: AuthenticatedRequest, res) => {
  try {
    const users = await listUsers(req.organizationId!);
    res.json(users);
  } catch (error) {
    console.error("GET /api/users", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

usersRouter.post(
  "/",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as CreateUserInput;
      const user = await createUser(
        req.organizationId!,
        {
          userId: body.userId,
          name: body.name,
          password: body.password,
          role: body.role as UserRole,
          branchId: body.branchId,
        },
        { id: req.user!.id, name: req.user!.name },
      );
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof UserError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/users", error);
      res.status(500).json({ error: "Failed to create user" });
    }
  },
);

usersRouter.get(
  "/:userId/provisioned-password",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await revealProvisionedPassword(
        {
          id: req.user!.id,
          role: req.user!.role,
          name: req.user!.name,
          organizationId: req.organizationId,
        },
        routeParam(req.params.userId),
      );
      res.json(result);
    } catch (error) {
      if (error instanceof ProvisionedCredentialsError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/users/:userId/provisioned-password", error);
      res.status(500).json({ error: "Failed to load provisioned password." });
    }
  },
);

usersRouter.post(
  "/:userId/provisioned-password",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const password = typeof req.body.password === "string" ? req.body.password : "";
      await resetUserPasswordAsAdmin(
        req.organizationId!,
        routeParam(req.params.userId),
        password,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof ProvisionedCredentialsError || error instanceof UserError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/users/:userId/provisioned-password", error);
      res.status(500).json({ error: "Failed to reset password." });
    }
  },
);
