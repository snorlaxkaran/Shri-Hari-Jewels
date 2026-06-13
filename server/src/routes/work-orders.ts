import { Router } from "express";
import {
  canCreateWorkOrders,
  canUpdateWorkOrders,
  canViewWorkOrders,
} from "../lib/auth/permissions.js";
import {
  createWorkOrder,
  listWorkOrders,
  updateWorkOrder,
  WorkOrderError,
} from "../lib/work-orders/service.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import { routeParam } from "../lib/route-param.js";
import type { NewWorkOrderInput, UpdateWorkOrderInput } from "../types.js";

export const workOrdersRouter = Router();

workOrdersRouter.use(authenticate);

workOrdersRouter.get("/", requireRole(canViewWorkOrders), async (_req, res) => {
  try {
    const workOrders = await listWorkOrders();
    res.json(workOrders);
  } catch (error) {
    console.error("GET /api/work-orders", error);
    res.status(500).json({ error: "Failed to fetch work orders" });
  }
});

workOrdersRouter.post(
  "/",
  requireRole(canCreateWorkOrders),
  async (req, res) => {
    try {
      const workOrder = await createWorkOrder(req.body as NewWorkOrderInput);
      res.status(201).json(workOrder);
    } catch (error) {
      if (error instanceof WorkOrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/work-orders", error);
      res.status(500).json({ error: "Failed to create work order" });
    }
  },
);

workOrdersRouter.patch(
  "/:id",
  requireRole(canUpdateWorkOrders),
  async (req, res) => {
    try {
      const workOrder = await updateWorkOrder(
        routeParam(req.params.id),
        req.body as UpdateWorkOrderInput,
      );
      res.json(workOrder);
    } catch (error) {
      if (error instanceof WorkOrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/work-orders/:id", error);
      res.status(500).json({ error: "Failed to update work order" });
    }
  },
);
