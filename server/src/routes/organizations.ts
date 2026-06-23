import { Router } from "express";
import { canManageOrganizations } from "../lib/auth/permissions.js";
import {
  createOrganization,
  deleteOrganization,
  getOrganization,
  listOrganizations,
  OrganizationError,
  updateOrganization,
} from "../lib/organizations/service.js";
import type { CreateOrganizationInput, UpdateOrganizationInput } from "../lib/organizations/service.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { routeParam } from "../lib/route-param.js";

export const organizationsRouter = Router();

organizationsRouter.use(authenticate);
organizationsRouter.use(requireRole(canManageOrganizations));

organizationsRouter.get("/", async (_req, res) => {
  try {
    const organizations = await listOrganizations();
    res.json(organizations);
  } catch (error) {
    console.error("GET /api/organizations", error);
    res.status(500).json({ error: "Failed to fetch companies." });
  }
});

organizationsRouter.get("/:id", async (req, res) => {
  try {
    const org = await getOrganization(routeParam(req.params.id));
    if (!org) {
      res.status(404).json({ error: "Company not found." });
      return;
    }
    res.json(org);
  } catch (error) {
    console.error("GET /api/organizations/:id", error);
    res.status(500).json({ error: "Failed to fetch company." });
  }
});

organizationsRouter.post("/", async (req, res) => {
  try {
    const org = await createOrganization(req.body as CreateOrganizationInput);
    res.status(201).json(org);
  } catch (error) {
    if (error instanceof OrganizationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/organizations", error);
    res.status(500).json({ error: "Failed to create company." });
  }
});

organizationsRouter.patch("/:id", async (req, res) => {
  try {
    const org = await updateOrganization(
      routeParam(req.params.id),
      req.body as UpdateOrganizationInput,
    );
    res.json(org);
  } catch (error) {
    if (error instanceof OrganizationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("PATCH /api/organizations/:id", error);
    res.status(500).json({ error: "Failed to update company." });
  }
});

organizationsRouter.delete("/:id", async (req, res) => {
  try {
    await deleteOrganization(routeParam(req.params.id));
    res.status(204).send();
  } catch (error) {
    if (error instanceof OrganizationError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("DELETE /api/organizations/:id", error);
    res.status(500).json({ error: "Failed to delete company." });
  }
});
