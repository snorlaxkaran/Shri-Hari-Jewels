import { Router } from "express";
import {
  createKarigarSettlement,
  listKarigarSettlements,
  settleKarigarSettlement,
} from "../lib/karigar/service.js";
import { canManageProductionRuns } from "../lib/auth/permissions.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { routeParam } from "../lib/route-param.js";
import { requireOrganization } from "../middleware/organization.js";

export const karigarRouter = Router();

karigarRouter.get(
  "/settlements",
  authenticate,
  requireOrganization,
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const status =
        req.query.status === "Open" || req.query.status === "Settled"
          ? req.query.status
          : undefined;
      const items = await listKarigarSettlements(req.organizationId!, status);
      res.json({ items });
    } catch (error) {
      console.error("GET /api/karigar/settlements", error);
      res.status(500).json({ error: "Failed to list karigar settlements." });
    }
  },
);

karigarRouter.post(
  "/settlements",
  authenticate,
  requireOrganization,
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as Record<string, unknown>;
      const row = await createKarigarSettlement({
        organizationId: req.organizationId!,
        productionRunId:
          typeof body.productionRunId === "string" ? body.productionRunId : undefined,
        karigarName: String(body.karigarName ?? ""),
        metalIssuedGrams: Number(body.metalIssuedGrams ?? 0),
        metalReturnedGrams: Number(body.metalReturnedGrams ?? 0),
        wastageCost: Number(body.wastageCost ?? 0),
        makingChargeWage: Number(body.makingChargeWage ?? 0),
        notes: typeof body.notes === "string" ? body.notes : undefined,
        createdByName: req.user!.name,
      });
      res.status(201).json({ id: row.id });
    } catch (error) {
      console.error("POST /api/karigar/settlements", error);
      res.status(500).json({ error: "Failed to create karigar settlement." });
    }
  },
);

karigarRouter.post(
  "/settlements/:id/settle",
  authenticate,
  requireOrganization,
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      await settleKarigarSettlement(
        routeParam(req.params.id),
        req.organizationId!,
        req.user!.name,
      );
      res.json({ ok: true });
    } catch (error) {
      console.error("POST /api/karigar/settlements/:id/settle", error);
      res.status(500).json({ error: "Failed to settle karigar payment." });
    }
  },
);
