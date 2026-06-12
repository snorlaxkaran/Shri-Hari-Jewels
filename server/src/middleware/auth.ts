import type { NextFunction, Request, Response } from "express";
import { verifyToken } from "../lib/auth/jwt.js";
import type { UserRole } from "../types.js";

export type AuthenticatedRequest = Request & {
  user?: {
    id: string;
    email: string;
    name: string;
    role: UserRole;
  };
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
    const payload = verifyToken(header.slice(7));
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      role: payload.role,
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
    if (req.user.role === "Admin" || check.some((fn) => fn(req.user!.role))) {
      next();
      return;
    }
    res.status(403).json({ error: "You do not have permission for this action." });
  };
