import { Router, type Request } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { sendTrialOtp, TrialOtpError, verifyTrialOtp } from "../lib/trial/otp.js";
import { provisionTrialTenant } from "../lib/trial/signup.js";

export const trialRouter = Router();

const phoneKey = (req: Request, prefix: string): string => {
  const raw = typeof req.body?.phone === "string" ? req.body.phone : "";
  const digits = raw.replace(/\D/g, "").slice(-10);
  if (digits.length === 10) return `${prefix}:${digits}`;
  return `${prefix}:ip:${ipKeyGenerator(req.ip ?? "unknown")}`;
};

const sendOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 12,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many code requests for this number. Try again in 15 minutes." },
  keyGenerator: (req) => phoneKey(req, "trial-send"),
});

const verifyOtpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many verification attempts. Try again in 15 minutes." },
  keyGenerator: (req) => phoneKey(req, "trial-verify"),
});

trialRouter.post("/send-otp", sendOtpRateLimiter, async (req, res) => {
  try {
    const phone = typeof req.body?.phone === "string" ? req.body.phone : "";
    const result = await sendTrialOtp(phone);
    res.json(result);
  } catch (error) {
    if (error instanceof TrialOtpError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/trial/send-otp", error);
    res.status(500).json({ error: "Could not send verification code." });
  }
});

trialRouter.post("/verify-otp", verifyOtpRateLimiter, async (req, res) => {
  try {
    const phone = typeof req.body?.phone === "string" ? req.body.phone : "";
    const code = typeof req.body?.code === "string" ? req.body.code : "";
    const { phone: verifiedPhone } = await verifyTrialOtp(phone, code);
    const session = await provisionTrialTenant(verifiedPhone);
    res.json(session);
  } catch (error) {
    if (error instanceof TrialOtpError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/trial/verify-otp", error);
    res.status(500).json({ error: "Could not start trial." });
  }
});
