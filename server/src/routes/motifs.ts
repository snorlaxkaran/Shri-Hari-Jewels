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
  updateMotif,
} from "../lib/motifs/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { DEFAULT_BRANCH_ID } from "../lib/branches/constants.js";
import { routeParam } from "../lib/route-param.js";
import type { NewMotifInput, UpdateMotifInput } from "../types.js";

export const motifsRouter = Router();

motifsRouter.use(authenticate);

const getUserBranch = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: { take: 1 } },
  });

  if (user?.defaultBranchId) return user.defaultBranchId;
  if (user?.branches.length) return user.branches[0].branchId;
  return DEFAULT_BRANCH_ID;
};

motifsRouter.get("/", requireRole(canViewMotifs), async (_req, res) => {
  try {
    const motifs = await listMotifs();
    res.json(motifs);
  } catch (error) {
    console.error("GET /api/motifs", error);
    res.status(500).json({ error: "Failed to fetch motifs" });
  }
});

motifsRouter.post("/", requireRole(canManageMotifs), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getUserBranch(req.user!.id);
    const motif = await createMotif(req.body as NewMotifInput, branchId);
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
    const branchId = await getUserBranch(req.user!.id);
    const items = req.body as NewMotifInput[];
    if (!Array.isArray(items) || items.length === 0) {
      res.status(400).json({ error: "Provide an array of motifs." });
      return;
    }
    const result = await createMotifsBulk(items, branchId);
    res.status(201).json(result);
  } catch (error) {
    console.error("POST /api/motifs/bulk", error);
    res.status(500).json({ error: "Failed to import motifs" });
  }
});

motifsRouter.patch("/:id", requireRole(canManageMotifs), async (req, res) => {
  try {
    const motif = await updateMotif(
      routeParam(req.params.id),
      req.body as UpdateMotifInput,
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

motifsRouter.delete("/:id", requireRole(canManageMotifs), async (req, res) => {
  try {
    await deleteMotif(routeParam(req.params.id));
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
