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
  getProductionRun,
  listProductionRuns,
  ProductionRunError,
  updateProductionRun,
  updateProductionRunItem,
} from "../lib/production-runs/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { DEFAULT_BRANCH_ID } from "../lib/branches/constants.js";
import { routeParam } from "../lib/route-param.js";
import type {
  NewProductionRunInput,
  UpdateProductionRunInput,
  UpdateProductionRunItemInput,
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
  async (req, res) => {
    try {
      const run = await updateProductionRun(
        routeParam(req.params.id),
        req.body as UpdateProductionRunInput,
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
  async (req, res) => {
    try {
      const run = await updateProductionRunItem(
        routeParam(req.params.id),
        routeParam(req.params.itemId),
        req.body as UpdateProductionRunItemInput,
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
