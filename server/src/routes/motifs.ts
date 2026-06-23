import { Router } from "express";
import {
  canManageMotifs,
  canViewMotifs,
} from "../lib/auth/permissions.js";
import {
  createMotif,
  createMotifsBulk,
  deleteMotif,
  listMotifs,
  MotifError,
  recalculateMotifPriceById,
  updateMotif,
} from "../lib/motifs/service.js";
import { getMotifPriceDrift } from "../lib/catalog/price-drift.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";
import type { NewMotifInput, UpdateMotifInput } from "../types.js";

export const motifsRouter = Router();

motifsRouter.use(authenticate);
motifsRouter.use(attachOrganization);

const actorFrom = (req: AuthenticatedRequest) => ({
  id: req.user!.id,
  name: req.user!.name,
});

motifsRouter.get("/", requireRole(canViewMotifs), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(req.user!.id, req.user!.role, req.organizationId!);
    const motifs = await listMotifs(req.organizationId!, branchId);
    res.json(motifs);
  } catch (error) {
    console.error("GET /api/motifs", error);
    res.status(500).json({ error: "Failed to fetch motifs" });
  }
});

motifsRouter.get(
  "/:id/price-drift",
  requireRole(canViewMotifs),
  async (req, res) => {
    try {
      const drift = await getMotifPriceDrift(routeParam(req.params.id));
      if (!drift) {
        res.status(404).json({ error: "Motif not found." });
        return;
      }
      res.json(drift);
    } catch (error) {
      console.error("GET /api/motifs/:id/price-drift", error);
      res.status(500).json({ error: "Failed to check motif price drift" });
    }
  },
);

motifsRouter.post(
  "/:id/recalculate-price",
  requireRole(canManageMotifs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const price = await recalculateMotifPriceById(
        routeParam(req.params.id),
        actorFrom(req),
        "Manual price recalculation",
      );
      res.json({ price });
    } catch (error) {
      if (error instanceof MotifError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/motifs/:id/recalculate-price", error);
      res.status(500).json({ error: "Failed to recalculate motif price" });
    }
  },
);

motifsRouter.post("/", requireRole(canManageMotifs), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getUserBranch(req.user!.id, req.organizationId!);
    const motif = await createMotif(
      req.body as NewMotifInput,
      branchId,
      actorFrom(req),
    );
    res.status(201).json(motif);
  } catch (error) {
    if (error instanceof MotifError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/motifs", error);
    res.status(500).json({ error: "Failed to create motif" });
  }
});

motifsRouter.post("/bulk", requireRole(canManageMotifs), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getUserBranch(req.user!.id, req.organizationId!);
    const items = req.body as NewMotifInput[];
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Provide an array of motifs." });
      return;
    }
    const result = await createMotifsBulk(items, branchId, actorFrom(req));
    res.status(201).json(result);
  } catch (error) {
    console.error("POST /api/motifs/bulk", error);
    res.status(500).json({ error: "Failed to import motifs" });
  }
});

motifsRouter.patch("/:id", requireRole(canManageMotifs), async (req: AuthenticatedRequest, res) => {
  try {
    const motif = await updateMotif(
      routeParam(req.params.id),
      req.body as UpdateMotifInput,
      actorFrom(req),
    );
    res.json(motif);
  } catch (error) {
    if (error instanceof MotifError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("PATCH /api/motifs/:id", error);
    res.status(500).json({ error: "Failed to update motif" });
  }
});

motifsRouter.delete("/:id", requireRole(canManageMotifs), async (req: AuthenticatedRequest, res) => {
  try {
    await deleteMotif(routeParam(req.params.id), actorFrom(req));
    res.status(204).send();
  } catch (error) {
    if (error instanceof MotifError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("DELETE /api/motifs/:id", error);
    res.status(500).json({ error: "Failed to delete motif" });
  }
});
