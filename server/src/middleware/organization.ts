import type { NextFunction, Response } from "express";
import {
  isSuperAdminRole,
  requireOrganizationId,
} from "../lib/organizations/access.js";
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
    next();
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Organization access denied.";
    res.status(403).json({ error: message });
  }
};
