import type { NextFunction, Response } from "express";
import {
  OrganizationAccessError,
  requireOrganizationId,
} from "../lib/organizations/access.js";
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
            "Your subscription period has ended. Please complete payment to continue.",
          status: access.subscription.status,
          trialEndsAt: access.subscription.trialEndsAt,
          currentPeriodEnd: access.subscription.currentPeriodEnd,
        });
        return;
      }
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
