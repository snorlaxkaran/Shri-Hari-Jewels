import { Router } from "express";
import { prisma } from "../lib/db.js";
import { canManageOrders } from "../lib/auth/permissions.js";
import {
  createOrder,
  listOrders,
  OrderError,
  updateOrder,
} from "../lib/orders/service.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { routeParam } from "../lib/route-param.js";
import type { NewOrderInput, UpdateOrderInput } from "../types.js";

export const ordersRouter = Router();

ordersRouter.use(authenticate);

// Helper to get user's branch
const getUserBranch = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: { take: 1 } },
  });

  if (user?.defaultBranchId) {
    return user.defaultBranchId;
  }

  if (user?.branches.length) {
    return user.branches[0].branchId;
  }

  return "main";
};

ordersRouter.get("/", requireRole(canManageOrders), async (_req, res) => {
  try {
    const orders = await listOrders();
    res.json(orders);
  } catch (error) {
    console.error("GET /api/orders", error);
    res.status(500).json({ error: "Failed to fetch orders" });
  }
});

ordersRouter.post(
  "/",
  requireRole(canManageOrders),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id);
      const order = await createOrder(req.body as NewOrderInput, branchId);
      res.status(201).json(order);
    } catch (error) {
      if (error instanceof OrderError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/orders", error);
      res.status(500).json({ error: "Failed to create order" });
    }
  },
);

ordersRouter.patch("/:id", requireRole(canManageOrders), async (req, res) => {
  try {
    const order = await updateOrder(
      routeParam(req.params.id),
      req.body as UpdateOrderInput,
    );
    res.json(order);
  } catch (error) {
    if (error instanceof OrderError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("PATCH /api/orders/:id", error);
    res.status(500).json({ error: "Failed to update order" });
  }
});
