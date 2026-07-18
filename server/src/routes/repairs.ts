import { Router } from "express";
import {
  canManageRepairs,
  canViewRepairs,
} from "../lib/auth/permissions.js";
import {
  approveRepair,
  countReadyForPickup,
  createRepairOrder,
  createRepairRedo,
  deliverRepair,
  getRepair,
  listRepairs,
  rejectRepair,
  RepairError,
  sendRepairForApproval,
  setRepairEstimate,
  updateRepairStatus,
} from "../lib/repairs/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";
import type {
  ApproveRepairInput,
  DeliverRepairInput,
  EstimateRepairInput,
  NewRepairOrderInput,
  RejectRepairInput,
  RepairStatus,
  UpdateRepairStatusInput,
} from "../types.js";

export const repairsRouter = Router();

repairsRouter.use(authenticate);
repairsRouter.use(attachOrganization);

repairsRouter.get(
  "/ready-for-pickup-count",
  requireRole(canViewRepairs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const count = await countReadyForPickup(req.organizationId!, branchId);
      res.json({ count });
    } catch (error) {
      console.error("GET /api/repairs/ready-for-pickup-count", error);
      res.status(500).json({ error: "Failed to fetch repair count" });
    }
  },
);

repairsRouter.get("/", requireRole(canViewRepairs), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(
      req.user!.id,
      req.user!.role,
      req.organizationId!,
    );
    const status = req.query.status as RepairStatus | undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const repairs = await listRepairs(req.organizationId!, {
      branchId,
      status,
      search,
    });
    res.json(repairs);
  } catch (error) {
    console.error("GET /api/repairs", error);
    res.status(500).json({ error: "Failed to fetch repairs" });
  }
});

repairsRouter.get("/:id", requireRole(canViewRepairs), async (req: AuthenticatedRequest, res) => {
  try {
    const repair = await getRepair(routeParam(req.params.id), req.organizationId!);
    if (!repair) {
      res.status(404).json({ error: "Repair order not found" });
      return;
    }
    res.json(repair);
  } catch (error) {
    console.error("GET /api/repairs/:id", error);
    res.status(500).json({ error: "Failed to fetch repair order" });
  }
});

repairsRouter.post(
  "/",
  requireRole(canManageRepairs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const repair = await createRepairOrder(
        req.body as NewRepairOrderInput,
        req.organizationId!,
        branchId,
        req.user!.name,
      );
      res.status(201).json(repair);
    } catch (error) {
      if (error instanceof RepairError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/repairs", error);
      res.status(500).json({ error: "Failed to create repair order" });
    }
  },
);

repairsRouter.patch(
  "/:id/estimate",
  requireRole(canManageRepairs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const repair = await setRepairEstimate(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as EstimateRepairInput,
        req.user!.name,
      );
      res.json(repair);
    } catch (error) {
      if (error instanceof RepairError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/repairs/:id/estimate", error);
      res.status(500).json({ error: "Failed to update estimate" });
    }
  },
);

repairsRouter.post(
  "/:id/send-for-approval",
  requireRole(canManageRepairs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const repair = await sendRepairForApproval(
        routeParam(req.params.id),
        req.organizationId!,
        req.user!.name,
      );
      res.json(repair);
    } catch (error) {
      if (error instanceof RepairError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/repairs/:id/send-for-approval", error);
      res.status(500).json({ error: "Failed to send for approval" });
    }
  },
);

repairsRouter.post(
  "/:id/approve",
  requireRole(canManageRepairs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const repair = await approveRepair(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as ApproveRepairInput,
        req.user!.name,
      );
      res.json(repair);
    } catch (error) {
      if (error instanceof RepairError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/repairs/:id/approve", error);
      res.status(500).json({ error: "Failed to approve repair" });
    }
  },
);

repairsRouter.post(
  "/:id/reject",
  requireRole(canManageRepairs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const repair = await rejectRepair(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as RejectRepairInput,
        req.user!.name,
      );
      res.json(repair);
    } catch (error) {
      if (error instanceof RepairError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/repairs/:id/reject", error);
      res.status(500).json({ error: "Failed to reject repair" });
    }
  },
);

repairsRouter.patch(
  "/:id/status",
  requireRole(canManageRepairs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const repair = await updateRepairStatus(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as UpdateRepairStatusInput,
        req.user!.name,
      );
      res.json(repair);
    } catch (error) {
      if (error instanceof RepairError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/repairs/:id/status", error);
      res.status(500).json({ error: "Failed to update repair status" });
    }
  },
);

repairsRouter.post(
  "/:id/deliver",
  requireRole(canManageRepairs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const repair = await deliverRepair(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as DeliverRepairInput,
        req.user!.name,
      );
      res.json(repair);
    } catch (error) {
      if (error instanceof RepairError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/repairs/:id/deliver", error);
      res.status(500).json({ error: "Failed to deliver repair" });
    }
  },
);

repairsRouter.post(
  "/:id/redo",
  requireRole(canManageRepairs),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const repair = await createRepairRedo(
        routeParam(req.params.id),
        req.organizationId!,
        branchId,
        req.user!.name,
      );
      res.status(201).json(repair);
    } catch (error) {
      if (error instanceof RepairError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/repairs/:id/redo", error);
      res.status(500).json({ error: "Failed to create redo repair" });
    }
  },
);
