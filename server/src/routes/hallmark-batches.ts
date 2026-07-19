import { Router } from "express";
import {
  canManageHallmark,
  canViewHallmark,
} from "../lib/auth/permissions.js";
import {
  countPendingHallmarkUnits,
  createHallmarkBatch,
  getHallmarkBatch,
  listHallmarkBatches,
  receiveHallmarkBatch,
  sendHallmarkBatch,
  updateHallmarkBatch,
} from "../lib/hallmark/service.js";
import { HallmarkError } from "../lib/hallmark/errors.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";
import type {
  CreateHallmarkBatchInput,
  ReceiveHallmarkBatchInput,
  UpdateHallmarkBatchInput,
} from "../types.js";

export const hallmarkBatchesRouter = Router();

hallmarkBatchesRouter.use(authenticate);
hallmarkBatchesRouter.use(attachOrganization);

hallmarkBatchesRouter.get(
  "/pending-count",
  requireRole(canViewHallmark),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const count = await countPendingHallmarkUnits(req.organizationId!, branchId);
      res.json({ count });
    } catch (error) {
      console.error("GET /api/hallmark-batches/pending-count", error);
      res.status(500).json({ error: "Failed to fetch hallmark pending count." });
    }
  },
);

hallmarkBatchesRouter.get(
  "/",
  requireRole(canViewHallmark),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const batches = await listHallmarkBatches(req.organizationId!, branchId);
      res.json(batches);
    } catch (error) {
      console.error("GET /api/hallmark-batches", error);
      res.status(500).json({ error: "Failed to fetch hallmark batches." });
    }
  },
);

hallmarkBatchesRouter.get(
  "/:id",
  requireRole(canViewHallmark),
  async (req: AuthenticatedRequest, res) => {
    try {
      const batch = await getHallmarkBatch(
        routeParam(req.params.id),
        req.organizationId!,
      );
      res.json(batch);
    } catch (error) {
      if (error instanceof HallmarkError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/hallmark-batches/:id", error);
      res.status(500).json({ error: "Failed to fetch hallmark batch." });
    }
  },
);

hallmarkBatchesRouter.post(
  "/",
  requireRole(canManageHallmark),
  async (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as CreateHallmarkBatchInput;
      const batch = await createHallmarkBatch(
        req.organizationId!,
        input,
        req.user!.name,
      );
      res.status(201).json(batch);
    } catch (error) {
      if (error instanceof HallmarkError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/hallmark-batches", error);
      res.status(500).json({ error: "Failed to create hallmark batch." });
    }
  },
);

hallmarkBatchesRouter.post(
  "/:id/send",
  requireRole(canManageHallmark),
  async (req: AuthenticatedRequest, res) => {
    try {
      const batch = await sendHallmarkBatch(
        routeParam(req.params.id),
        req.organizationId!,
      );
      res.json(batch);
    } catch (error) {
      if (error instanceof HallmarkError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/hallmark-batches/:id/send", error);
      res.status(500).json({ error: "Failed to mark batch as sent." });
    }
  },
);

hallmarkBatchesRouter.post(
  "/:id/receive",
  requireRole(canManageHallmark),
  async (req: AuthenticatedRequest, res) => {
    try {
      const batch = await receiveHallmarkBatch(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as ReceiveHallmarkBatchInput,
      );
      res.json(batch);
    } catch (error) {
      if (error instanceof HallmarkError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/hallmark-batches/:id/receive", error);
      res.status(500).json({ error: "Failed to receive hallmark batch." });
    }
  },
);

hallmarkBatchesRouter.patch(
  "/:id",
  requireRole(canManageHallmark),
  async (req: AuthenticatedRequest, res) => {
    try {
      const batch = await updateHallmarkBatch(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as UpdateHallmarkBatchInput,
      );
      res.json(batch);
    } catch (error) {
      if (error instanceof HallmarkError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/hallmark-batches/:id", error);
      res.status(500).json({ error: "Failed to update hallmark batch." });
    }
  },
);
