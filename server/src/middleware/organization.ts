import type { NextFunction, Response } from "express";
import {
  OrganizationAccessError,
  requireOrganizationId,
} from "../lib/organizations/access.js";
import { enforceModuleAccessForRequest } from "../lib/modules/access.js";
import {
  checkSubscriptionAccess,
  isBillingRoute,
} from "../lib/subscriptions/service.js";
import type { AuthenticatedRequest } from "./auth.js";

export const attachOrganization = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    req.organizationId = await requireOrganizationId(req.user.id, req.user.role);

    if (!isBillingRoute(req.originalUrl)) {
      const access = await checkSubscriptionAccess(req.organizationId);

      if (!access.allowed && access.subscription) {
        res.status(402).json({
          error: "subscription_expired",
          message:
            "Your 2-month trial has ended. The main account holder should contact +91 9971692727 to renew access.",
          status: access.subscription.status,
          trialEndsAt: access.subscription.trialEndsAt,
          currentPeriodEnd: access.subscription.currentPeriodEnd,
        });
        return;
      }

      const moduleAllowed = await enforceModuleAccessForRequest(req, res);
      if (!moduleAllowed) return;
    }

    next();
  } catch (error) {
    const statusCode =
      error instanceof OrganizationAccessError ? error.statusCode : 403;
    const message =
      error instanceof Error ? error.message : "Organization access denied.";
    res.status(statusCode).json({ error: message });
  }
};

export const requireOrganization = attachOrganization;
