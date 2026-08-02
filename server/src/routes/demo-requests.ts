import { DemoRequestStatus } from "@prisma/client";
import { Router } from "express";
import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { prisma } from "../lib/db.js";
import { canManageOrganizations } from "../lib/auth/permissions.js";
import { notifyPlatformAdminsOfDemoRequest } from "../lib/demo-requests/notify.js";
import { routeParam } from "../lib/route-param.js";
import { authenticate, requireRole } from "../middleware/auth.js";

export const demoRequestsRouter = Router();

const submitRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many demo requests. Please try again later." },
  keyGenerator: (req) => ipKeyGenerator(req.ip ?? "unknown"),
});

const VALID_STATUSES = new Set<string>(Object.values(DemoRequestStatus));

const trimOrNull = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

demoRequestsRouter.post("/", submitRateLimiter, async (req, res) => {
  try {
    const businessName = trimOrNull(req.body.businessName);
    const contactName = trimOrNull(req.body.contactName);
    const phone = trimOrNull(req.body.phone);

    if (!businessName) {
      res.status(400).json({ error: "Business name is required." });
      return;
    }
    if (!contactName) {
      res.status(400).json({ error: "Contact name is required." });
      return;
    }
    if (!phone) {
      res.status(400).json({ error: "Phone number is required." });
      return;
    }

    const email = trimOrNull(req.body.email);
    if (email && !email.includes("@")) {
      res.status(400).json({ error: "Email address is invalid." });
      return;
    }

    const payload = {
      businessName,
      contactName,
      phone,
      email,
      city: trimOrNull(req.body.city),
      businessType: trimOrNull(req.body.businessType),
      message: trimOrNull(req.body.message),
    };

    const created = await prisma.demoRequest.create({ data: payload });

    void notifyPlatformAdminsOfDemoRequest(payload).catch((err) => {
      console.error("Demo request notification failed", err);
    });

    res.status(201).json({
      id: created.id,
      message: "Thank you — we'll be in touch shortly.",
    });
  } catch (error) {
    console.error("POST /api/demo-requests", error);
    res.status(500).json({ error: "Failed to submit demo request." });
  }
});

demoRequestsRouter.get(
  "/",
  authenticate,
  requireRole(canManageOrganizations),
  async (_req, res) => {
    try {
      const requests = await prisma.demoRequest.findMany({
        orderBy: { createdAt: "desc" },
      });
      res.json(
        requests.map((row) => ({
          id: row.id,
          businessName: row.businessName,
          contactName: row.contactName,
          phone: row.phone,
          email: row.email,
          city: row.city,
          businessType: row.businessType,
          message: row.message,
          status: row.status,
          createdAt: row.createdAt.toISOString(),
        })),
      );
    } catch (error) {
      console.error("GET /api/demo-requests", error);
      res.status(500).json({ error: "Failed to fetch demo requests." });
    }
  },
);

demoRequestsRouter.patch(
  "/:id/status",
  authenticate,
  requireRole(canManageOrganizations),
  async (req, res) => {
    try {
      const status = req.body.status;
      if (typeof status !== "string" || !VALID_STATUSES.has(status)) {
        res.status(400).json({ error: "Invalid status." });
        return;
      }

      const existing = await prisma.demoRequest.findUnique({
        where: { id: routeParam(req.params.id) },
      });
      if (!existing) {
        res.status(404).json({ error: "Demo request not found." });
        return;
      }

      const updated = await prisma.demoRequest.update({
        where: { id: existing.id },
        data: { status: status as DemoRequestStatus },
      });

      res.json({
        id: updated.id,
        status: updated.status,
        createdAt: updated.createdAt.toISOString(),
      });
    } catch (error) {
      console.error("PATCH /api/demo-requests/:id/status", error);
      res.status(500).json({ error: "Failed to update demo request." });
    }
  },
);
