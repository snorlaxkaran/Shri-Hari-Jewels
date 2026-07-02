import { Router } from "express";
import { canManageBranches, canManageCustomers, canManageStockTransfers } from "../lib/auth/permissions.js";
import {
  createBranch,
  BranchError,
  listBranches,
  getBranchDetail,
  updateBranch,
  deactivateBranch,
  assignUserToBranch,
  removeUserFromBranch,
  getUserBranches,
} from "../lib/branches/service.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { routeParam } from "../lib/route-param.js";
import type { NewBranchInput, UpdateBranchInput } from "../types.js";

export const branchesRouter = Router();

branchesRouter.use(authenticate);
branchesRouter.use(attachOrganization);

const canViewBranches = (role: Parameters<typeof canManageBranches>[0]) =>
  canManageBranches(role) ||
  canManageCustomers(role) ||
  canManageStockTransfers(role);

// List all branches
branchesRouter.get("/", requireRole(canViewBranches), async (req: AuthenticatedRequest, res) => {
  try {
    const branches = await listBranches(req.organizationId!);
    res.json(branches);
  } catch (error) {
    console.error("GET /api/branches", error);
    res.status(500).json({ error: "Failed to fetch branches" });
  }
});

// Get my branches (for current user)
branchesRouter.get("/user/me", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const branches = await getUserBranches(userId, req.organizationId!);
    res.json(branches);
  } catch (error) {
    console.error("GET /api/branches/user/me", error);
    res.status(500).json({ error: "Failed to fetch user branches" });
  }
});

// Get branch detail
branchesRouter.get("/:id", requireRole(canManageBranches), async (req: AuthenticatedRequest, res) => {
  try {
    const branch = await getBranchDetail(routeParam(req.params.id), req.organizationId!);
    if (!branch) {
      res.status(404).json({ error: "Branch not found" });
      return;
    }
    res.json(branch);
  } catch (error) {
    console.error("GET /api/branches/:id", error);
    res.status(500).json({ error: "Failed to fetch branch" });
  }
});

// Create branch
branchesRouter.post("/", requireRole(canManageBranches), async (req: AuthenticatedRequest, res) => {
  try {
    const branch = await createBranch(req.organizationId!, req.body as NewBranchInput);
    res.status(201).json(branch);
  } catch (error) {
    if (error instanceof BranchError) {
      res.status(400).json({ error: error.message });
    } else {
      console.error("POST /api/branches", error);
      res.status(500).json({ error: "Failed to create branch" });
    }
  }
});

// Update branch
branchesRouter.patch(
  "/:id",
  requireRole(canManageBranches),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branch = await updateBranch(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as UpdateBranchInput,
      );
      res.json(branch);
    } catch (error) {
      if (error instanceof BranchError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error("PATCH /api/branches/:id", error);
        res.status(500).json({ error: "Failed to update branch" });
      }
    }
  },
);

// Deactivate branch
branchesRouter.delete(
  "/:id",
  requireRole(canManageBranches),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branch = await deactivateBranch(routeParam(req.params.id), req.organizationId!);
      res.json(branch);
    } catch (error) {
      if (error instanceof BranchError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error("DELETE /api/branches/:id", error);
        res.status(500).json({ error: "Failed to deactivate branch" });
      }
    }
  },
);

// Assign user to branch
branchesRouter.post(
  "/:branchId/users/:userId",
  requireRole(canManageBranches),
  async (req: AuthenticatedRequest, res) => {
    try {
      await assignUserToBranch(
        routeParam(req.params.userId),
        routeParam(req.params.branchId),
        req.organizationId!,
      );
      res.status(204).send();
    } catch (error) {
      if (error instanceof BranchError) {
        res.status(400).json({ error: error.message });
      } else {
        console.error("POST /api/branches/:branchId/users/:userId", error);
        res.status(500).json({ error: "Failed to assign user to branch" });
      }
    }
  },
);

// Remove user from branch
branchesRouter.delete(
  "/:branchId/users/:userId",
  requireRole(canManageBranches),
  async (req, res) => {
    try {
      await removeUserFromBranch(
        routeParam(req.params.userId),
        routeParam(req.params.branchId),
      );
      res.status(204).send();
    } catch (error) {
      console.error("DELETE /api/branches/:branchId/users/:userId", error);
      res.status(500).json({ error: "Failed to remove user from branch" });
    }
  },
);
