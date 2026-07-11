import rateLimit, { ipKeyGenerator } from "express-rate-limit";

const rateLimitIp = (ip: string | undefined) =>
  ipKeyGenerator(ip ?? "unknown");

export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many authentication attempts. Please try again later." },
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    const ip = rateLimitIp(req.ip);
    return email ? `${ip}:${email}` : ip;
  },
});

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts for this account. Please try again later." },
  keyGenerator: (req) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";
    return email ? `login:${email}` : `login:${rateLimitIp(req.ip)}`;
  },
});
