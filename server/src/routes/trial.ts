import { Router, type Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { registerTrialTenant, TrialSignupError } from "../lib/trial/signup.js";

export const trialRouter = Router();

const phoneKey = (req: Request, prefix: string): string => {
  const raw = typeof req.body?.phone === "string" ? req.body.phone : "";
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length === 10) return `${prefix}:${digits}`;
  return `${prefix}:ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
};

const registerRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many signup attempts. Try again in 15 minutes." },
  keyGenerator: (req) => phoneKey(req, "trial-register"),
});

trialRouter.post("/register", registerRateLimiter, async (req, res) => {
  try {
    const phone = typeof req.body?.phone === "string" ? req.body.phone : "";
    const userId = typeof req.body?.userId === "string" ? req.body.userId : "";
    const password = typeof req.body?.password === "string" ? req.body.password : "";
    const name = typeof req.body?.name === "string" ? req.body.name : undefined;

    const session = await registerTrialTenant({ phone, userId, password, name });
    res.json(session);
  } catch (error) {
    if (error instanceof TrialSignupError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/trial/register", error);
    res.status(500).json({ error: "Could not start trial." });
  }
});
