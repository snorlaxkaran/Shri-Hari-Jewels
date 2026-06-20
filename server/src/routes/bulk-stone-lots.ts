import { Router } from "express";
import {
  canManageMotifs,
  canViewMotifs,
} from "../lib/auth/permissions.js";
import {
  BulkStoneLotError,
  createBulkStoneLot,
  deleteBulkStoneLot,
  listBulkStoneLots,
  updateBulkStoneLot,
} from "../lib/bulk-stone-lots/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { DEFAULT_BRANCH_ID } from "../lib/branches/constants.js";
import { routeParam } from "../lib/route-param.js";
import type {
  NewBulkStoneLotInput,
  UpdateBulkStoneLotInput,
} from "../types.js";

export const bulkStoneLotsRouter = Router();

bulkStoneLotsRouter.use(authenticate);

const getUserBranch = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: { take: 1 } },
  });

  if (user?.defaultBranchId) return user.defaultBranchId;
  if (user?.branches.length) return user.branches[0].branchId;
  return DEFAULT_BRANCH_ID;
};

bulkStoneLotsRouter.get("/", requireRole(canViewMotifs), async (_req, res) => {
  try {
    const lots = await listBulkStoneLots();
    res.json(lots);
  } catch (error) {
    console.error("GET /api/bulk-stone-lots", error);
    res.status(500).json({ error: "Failed to fetch bulk stone lots" });
  }
});

bulkStoneLotsRouter.post(
  "/",
  requireRole(canManageMotifs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id);
      const lot = await createBulkStoneLot(
        req.body as NewBulkStoneLotInput,
        branchId,
      );
      res.status(201).json(lot);
    } catch (error) {
      if (error instanceof BulkStoneLotError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/bulk-stone-lots", error);
      res.status(500).json({ error: "Failed to create bulk stone lot" });
    }
  },
);

bulkStoneLotsRouter.patch(
  "/:id",
  requireRole(canManageMotifs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lot = await updateBulkStoneLot(
        routeParam(req.params.id),
        req.body as UpdateBulkStoneLotInput,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(lot);
    } catch (error) {
      if (error instanceof BulkStoneLotError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/bulk-stone-lots/:id", error);
      res.status(500).json({ error: "Failed to update bulk stone lot" });
    }
  },
);

bulkStoneLotsRouter.delete(
  "/:id",
  requireRole(canManageMotifs),
  async (req, res) => {
    try {
      await deleteBulkStoneLot(routeParam(req.params.id));
      res.status(204).send();
    } catch (error) {
      if (error instanceof BulkStoneLotError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/bulk-stone-lots/:id", error);
      res.status(500).json({ error: "Failed to delete bulk stone lot" });
    }
  },
);
