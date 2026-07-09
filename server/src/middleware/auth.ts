import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../lib/auth/jwt.js";
import type { UserRole } from "../types.js";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
    organizationId?: string;
    organizationName?: string;
  };
  organizationId?: string;
};

export const authenticate = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): void => {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const payload = verifyAccessToken(header.slice(7));
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
      organizationId: payload.organizationId,
      organizationName: payload.organizationName,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session." });
  }
};

export const requireRole =
  (...check: Array<(role: UserRole) => boolean>) =>
  (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Authentication required." });
      return;
    }
    if (req.user.role === "Admin" || req.user.role === "SuperAdmin" || check.some((fn) => fn(req.user!.role))) {
      next();
      return;
    }
    res.status(403).json({ error: "You do not have permission for this action." });
  };
