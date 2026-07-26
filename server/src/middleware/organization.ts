import type { NextFunction, Response } from "express";
import {
  isSuperAdminRole,
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

  if (isSuperAdminRole(req.user.role)) {
    next();
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
    const message =
      error instanceof Error ? error.message : "Organization access denied.";
    res.status(403).json({ error: message });
  }
};

export const requireOrganization = attachOrganization;
