import { Router } from "express";
import {
  canManageDesigns,
  canViewDesigns,
} from "../lib/auth/permissions.js";
import {
  addDesignElement,
  createDesign,
  deleteDesign,
  deleteDesignElement,
  DesignError,
  listDesigns,
  updateDesign,
  updateDesignElement,
} from "../lib/designs/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { DEFAULT_BRANCH_ID } from "../lib/branches/constants.js";
import { routeParam } from "../lib/route-param.js";
import type {
  NewDesignElementInput,
  NewDesignInput,
  UpdateDesignElementInput,
  UpdateDesignInput,
} from "../types.js";

export const designsRouter = Router();

designsRouter.use(authenticate);

const getUserBranch = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: { take: 1 } },
  });

  if (user?.defaultBranchId) return user.defaultBranchId;
  if (user?.branches.length) return user.branches[0].branchId;
  return DEFAULT_BRANCH_ID;
};

designsRouter.get("/", requireRole(canViewDesigns), async (_req, res) => {
  try {
    const designs = await listDesigns();
    res.json(designs);
  } catch (error) {
    console.error("GET /api/designs", error);
    res.status(500).json({ error: "Failed to fetch designs" });
  }
});

designsRouter.post(
  "/",
  requireRole(canManageDesigns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id);
      const design = await createDesign(req.body as NewDesignInput, branchId);
      res.status(201).json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/designs", error);
      res.status(500).json({ error: "Failed to create design" });
    }
  },
);

designsRouter.patch(
  "/:id",
  requireRole(canManageDesigns),
  async (req, res) => {
    try {
      const design = await updateDesign(
        routeParam(req.params.id),
        req.body as UpdateDesignInput,
      );
      res.json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/designs/:id", error);
      res.status(500).json({ error: "Failed to update design" });
    }
  },
);

designsRouter.delete(
  "/:id",
  requireRole(canManageDesigns),
  async (req, res) => {
    try {
      await deleteDesign(routeParam(req.params.id));
      res.status(204).send();
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/designs/:id", error);
      res.status(500).json({ error: "Failed to delete design" });
    }
  },
);

designsRouter.post(
  "/:id/elements",
  requireRole(canManageDesigns),
  async (req, res) => {
    try {
      const design = await addDesignElement(
        routeParam(req.params.id),
        req.body as NewDesignElementInput,
      );
      res.status(201).json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/designs/:id/elements", error);
      res.status(500).json({ error: "Failed to add design element" });
    }
  },
);

designsRouter.patch(
  "/:id/elements/:elementId",
  requireRole(canManageDesigns),
  async (req, res) => {
    try {
      const design = await updateDesignElement(
        routeParam(req.params.id),
        routeParam(req.params.elementId),
        req.body as UpdateDesignElementInput,
      );
      res.json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/designs/:id/elements/:elementId", error);
      res.status(500).json({ error: "Failed to update design element" });
    }
  },
);

designsRouter.delete(
  "/:id/elements/:elementId",
  requireRole(canManageDesigns),
  async (req, res) => {
    try {
      const design = await deleteDesignElement(
        routeParam(req.params.id),
        routeParam(req.params.elementId),
      );
      res.json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/designs/:id/elements/:elementId", error);
      res.status(500).json({ error: "Failed to delete design element" });
    }
  },
);
