import { Router } from "express";
import {
  AuthError,
  adminResetTotp,
  confirmTotpSetup,
  disableTotp,
  getUserById,
  login,
  logout,
  refreshAccessToken,
  setupTotp,
  verify2faLogin,
} from "../lib/auth/service.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { authRateLimiter, loginRateLimiter } from "../middleware/rate-limit.js";
import { canManageOrganizations } from "../lib/auth/permissions.js";
import { routeParam } from "../lib/route-param.js";
import type { LoginInput } from "../types.js";

export const authRouter = Router();

authRouter.use(authRateLimiter);

authRouter.post("/login", loginRateLimiter, async (req, res) => {
  try {
    const result = await login(req.body as LoginInput);
    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/auth/login", error);
    res.status(500).json({ error: "Login failed." });
  }
});

authRouter.post("/2fa/verify", async (req, res) => {
  try {
    const { tempToken, code } = req.body as { tempToken?: string; code?: string };
    if (!tempToken || !code) {
      res.status(400).json({ error: "tempToken and code are required." });
      return;
    }
    const result = await verify2faLogin(tempToken, code);
    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/auth/2fa/verify", error);
    res.status(500).json({ error: "2FA verification failed." });
  }
});

authRouter.post("/refresh", async (req, res) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    if (!refreshToken) {
      res.status(400).json({ error: "refreshToken is required." });
      return;
    }
    const result = await refreshAccessToken(refreshToken);
    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/auth/refresh", error);
    res.status(500).json({ error: "Token refresh failed." });
  }
});

authRouter.post("/logout", async (req, res) => {
  try {
    const { refreshToken } = req.body as { refreshToken?: string };
    await logout(refreshToken);
    res.json({ ok: true });
  } catch (error) {
    console.error("POST /api/auth/logout", error);
    res.status(500).json({ error: "Logout failed." });
  }
});

authRouter.get("/me", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const user = await getUserById(req.user!.id);
    if (!user) {
      res.status(401).json({ error: "User not found." });
      return;
    }
    res.json({ user });
  } catch (error) {
    console.error("GET /api/auth/me", error);
    res.status(500).json({ error: "Failed to fetch user." });
  }
});

authRouter.post("/2fa/setup", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const result = await setupTotp(req.user!.id);
    res.json(result);
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/auth/2fa/setup", error);
    res.status(500).json({ error: "2FA setup failed." });
  }
});

authRouter.post("/2fa/confirm", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) {
      res.status(400).json({ error: "code is required." });
      return;
    }
    await confirmTotpSetup(req.user!.id, code);
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/auth/2fa/confirm", error);
    res.status(500).json({ error: "2FA confirmation failed." });
  }
});

authRouter.post("/2fa/disable", authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const { code } = req.body as { code?: string };
    if (!code) {
      res.status(400).json({ error: "code is required." });
      return;
    }
    await disableTotp(req.user!.id, code, {
      id: req.user!.id,
      name: req.user!.name,
    });
    res.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/auth/2fa/disable", error);
    res.status(500).json({ error: "2FA disable failed." });
  }
});

authRouter.post(
  "/2fa/reset/:userId",
  authenticate,
  requireRole(canManageOrganizations),
  async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.params.userId;
      if (!userId) {
        res.status(400).json({ error: "userId is required." });
        return;
      }
      await adminResetTotp(routeParam(req.params.userId), {
        id: req.user!.id,
        name: req.user!.name,
        organizationId: req.user!.organizationId,
      });
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof AuthError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/auth/2fa/reset", error);
      res.status(500).json({ error: "2FA reset failed." });
    }
  },
);
