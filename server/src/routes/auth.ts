import { Router } from "express";
import { AuthError, getUserById, login } from "../lib/auth/service.js";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import type { LoginInput } from "../types.js";

export const authRouter = Router();

authRouter.post("/login", async (req, res) => {
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
