import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { sendTrialOtp, TrialOtpError, verifyTrialOtp } from "../lib/trial/otp.js";
import { provisionTrialTenant } from "../lib/trial/signup.js";

export const trialRouter = Router();

const otpRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many OTP requests. Try again later." },
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
});

trialRouter.post("/send-otp", otpRateLimiter, async (req, res) => {
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

trialRouter.post("/verify-otp", otpRateLimiter, async (req, res) => {
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
