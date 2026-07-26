import { Router } from "express";
import {
  getPlatformContactInfo,
  getSubscriptionWithPayments,
} from "../lib/subscriptions/service.js";
import { authenticate, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";

export const billingRouter = Router();

billingRouter.use(authenticate);
billingRouter.use(attachOrganization);

billingRouter.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const data = await getSubscriptionWithPayments(req.organizationId!);
    if (!data) {
      res.status(404).json({ error: "Subscription not found." });
      return;
    }
    res.json(data);
  } catch (error) {
    console.error("GET /api/billing", error);
    res.status(500).json({ error: "Failed to fetch billing information." });
  }
});

billingRouter.get("/contact", async (_req, res) => {
  res.json(getPlatformContactInfo());
});
