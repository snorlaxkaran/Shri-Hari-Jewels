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
import {
  extendSubscriptionTrial,
  getOrganizationSubscriptionDetail,
  listOrganizationsWithSubscriptions,
  reactivateSubscription,
  recordSubscriptionPayment,
  SubscriptionError,
  suspendSubscription,
} from "../lib/subscriptions/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { routeParam } from "../lib/route-param.js";

export const organizationsRouter = Router();

organizationsRouter.use(authenticate);
organizationsRouter.use(requireRole(canManageOrganizations));

organizationsRouter.get("/", async (req, res) => {
  try {
    const expiringSoon = req.query.expiringSoon;
    if (expiringSoon != null) {
      const days = Number(expiringSoon) || 7;
      const organizations = await listOrganizationsWithSubscriptions({
        expiringWithinDays: days,
      });
      res.json(organizations);
      return;
    }

    const organizations = await listOrganizationsWithSubscriptions();
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

organizationsRouter.get("/:id/subscription", async (req, res) => {
  try {
    const detail = await getOrganizationSubscriptionDetail(routeParam(req.params.id));
    if (!detail) {
      res.status(404).json({ error: "Company not found." });
      return;
    }
    res.json(detail);
  } catch (error) {
    console.error("GET /api/organizations/:id/subscription", error);
    res.status(500).json({ error: "Failed to fetch subscription." });
  }
});

organizationsRouter.post("/:id/subscription/record-payment", async (req: AuthenticatedRequest, res) => {
  try {
    const result = await recordSubscriptionPayment(routeParam(req.params.id), {
      amount: Number(req.body.amount),
      method: String(req.body.method ?? "Bank Transfer"),
      periodCovered: req.body.periodCovered,
      notes: req.body.notes,
      recordedByName: req.user?.name ?? "Platform Admin",
    });
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof SubscriptionError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/organizations/:id/subscription/record-payment", error);
    res.status(500).json({ error: "Failed to record payment." });
  }
});

organizationsRouter.post("/:id/subscription/extend-trial", async (req, res) => {
  try {
    const subscription = await extendSubscriptionTrial(routeParam(req.params.id), {
      newTrialEndsAt: String(req.body.newTrialEndsAt),
    });
    res.json(subscription);
  } catch (error) {
    if (error instanceof SubscriptionError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/organizations/:id/subscription/extend-trial", error);
    res.status(500).json({ error: "Failed to extend trial." });
  }
});

organizationsRouter.post("/:id/subscription/suspend", async (req, res) => {
  try {
    const subscription = await suspendSubscription(routeParam(req.params.id));
    res.json(subscription);
  } catch (error) {
    if (error instanceof SubscriptionError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/organizations/:id/subscription/suspend", error);
    res.status(500).json({ error: "Failed to suspend subscription." });
  }
});

organizationsRouter.post("/:id/subscription/reactivate", async (req, res) => {
  try {
    const subscription = await reactivateSubscription(routeParam(req.params.id));
    res.json(subscription);
  } catch (error) {
    if (error instanceof SubscriptionError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/organizations/:id/subscription/reactivate", error);
    res.status(500).json({ error: "Failed to reactivate subscription." });
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
