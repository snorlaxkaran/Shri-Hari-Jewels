import { Router } from "express";
import {
  canManageProductionRuns,
  canUpdateProductionRunItems,
  canViewProductionRuns,
} from "../lib/auth/permissions.js";
import {
  createProductionRun,
  deleteProductionRun,
  exportProductionRunCsv,
  getFinishedGoodsDefaults,
  getProductionRun,
  listProductionRuns,
  ProductionRunError,
  updateProductionRun,
  updateProductionRunItem,
} from "../lib/production-runs/service.js";
import { completeProductionRunStage } from "../lib/production-runs/stage-service.js";
import { slugToStage } from "../lib/production-runs/stages.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { DEFAULT_BRANCH_ID } from "../lib/branches/constants.js";
import { routeParam } from "../lib/route-param.js";
import type {
  NewProductionRunInput,
  UpdateProductionRunInput,
  UpdateProductionRunItemInput,
  CompleteProductionRunStageInput,
} from "../types.js";

export const productionRunsRouter = Router();

productionRunsRouter.use(authenticate);

const getUserBranch = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: { take: 1 } },
  });

  if (user?.defaultBranchId) return user.defaultBranchId;
  if (user?.branches.length) return user.branches[0].branchId;
  return DEFAULT_BRANCH_ID;
};

productionRunsRouter.get(
  "/",
  requireRole(canViewProductionRuns),
  async (_req, res) => {
    try {
      const runs = await listProductionRuns();
      res.json(runs);
    } catch (error) {
      console.error("GET /api/production-runs", error);
      res.status(500).json({ error: "Failed to fetch production runs" });
    }
  },
);

productionRunsRouter.get(
  "/:id/finished-goods-defaults",
  requireRole(canManageProductionRuns),
  async (req, res) => {
    try {
      const defaults = await getFinishedGoodsDefaults(routeParam(req.params.id));
      res.json(defaults);
    } catch (error) {
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id/finished-goods-defaults", error);
      res.status(500).json({ error: "Failed to load finished goods defaults" });
    }
  },
);

productionRunsRouter.get(
  "/:id",
  requireRole(canViewProductionRuns),
  async (req, res) => {
    try {
      const run = await getProductionRun(routeParam(req.params.id));
      res.json(run);
    } catch (error) {
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id", error);
      res.status(500).json({ error: "Failed to fetch production run" });
    }
  },
);

productionRunsRouter.get(
  "/:id/export",
  requireRole(canViewProductionRuns),
  async (req, res) => {
    try {
      const id = routeParam(req.params.id);
      const run = await getProductionRun(id);
      const csv = await exportProductionRunCsv(id);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${run.runNo}.csv"`,
      );
      res.send(csv);
    } catch (error) {
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id/export", error);
      res.status(500).json({ error: "Failed to export production run" });
    }
  },
);

productionRunsRouter.post(
  "/",
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id);
      const run = await createProductionRun(
        req.body as NewProductionRunInput,
        branchId,
      );
      res.status(201).json(run);
    } catch (error) {
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/production-runs", error);
      res.status(500).json({ error: "Failed to create production run" });
    }
  },
);

productionRunsRouter.patch(
  "/:id",
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const run = await updateProductionRun(
        routeParam(req.params.id),
        req.body as UpdateProductionRunInput,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(run);
    } catch (error) {
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/production-runs/:id", error);
      res.status(500).json({ error: "Failed to update production run" });
    }
  },
);

productionRunsRouter.patch(
  "/:id/items/:itemId",
  requireRole(canUpdateProductionRunItems),
  async (req: AuthenticatedRequest, res) => {
    try {
      const run = await updateProductionRunItem(
        routeParam(req.params.id),
        routeParam(req.params.itemId),
        req.body as UpdateProductionRunItemInput,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(run);
    } catch (error) {
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/production-runs/:id/items/:itemId", error);
      res.status(500).json({ error: "Failed to update production run item" });
    }
  },
);

productionRunsRouter.post(
  "/:id/stages/:stageSlug/complete",
  requireRole(canUpdateProductionRunItems),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stage = slugToStage(routeParam(req.params.stageSlug));
      if (!stage) {
        res.status(400).json({ error: "Invalid stage." });
        return;
      }
      const result = await completeProductionRunStage(
        routeParam(req.params.id),
        stage,
        req.body as CompleteProductionRunStageInput,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(result);
    } catch (error) {
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/production-runs/:id/stages/:stageSlug/complete", error);
      res.status(500).json({ error: "Failed to complete stage" });
    }
  },
);

productionRunsRouter.delete(
  "/:id",
  requireRole(canManageProductionRuns),
  async (req, res) => {
    try {
      await deleteProductionRun(routeParam(req.params.id));
      res.status(204).send();
    } catch (error) {
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/production-runs/:id", error);
      res.status(500).json({ error: "Failed to delete production run" });
    }
  },
);
