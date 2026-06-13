import { Router } from "express";
import { prisma } from "../lib/db.js";
import {
  canDeleteProduct,
  canReadInventory,
  canWriteInventory,
} from "../lib/auth/permissions.js";
import {
  addQuantityToProduct,
  createProduct,
  deleteInventoryUnit,
  deleteProduct,
  InventoryError,
  listProducts,
  updateProduct,
} from "../lib/inventory/service.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { routeParam } from "../lib/route-param.js";
import type { NewProductInput, UpdateProductInput } from "../types.js";

export const inventoryRouter = Router();

inventoryRouter.use(authenticate);

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

  // Fallback to main branch
  return "main";
};

inventoryRouter.get("/", requireRole(canReadInventory), async (_req, res) => {
  try {
    const items = await listProducts();
    res.json(items);
  } catch (error) {
    console.error("GET /api/inventory", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

inventoryRouter.post(
  "/",
  requireRole(canWriteInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as NewProductInput;

      if (!input.name?.trim()) {
        res.status(400).json({ error: "Product name is required" });
        return;
      }
      if (!input.quantity || input.quantity < 1) {
        res.status(400).json({ error: "Quantity must be at least 1" });
        return;
      }

      const branchId = await getUserBranch(req.user!.id);

      const product = await createProduct(
        {
          ...input,
          images: input.images ?? [],
        },
        branchId,
      );
      res.status(201).json(product);
    } catch (error) {
      console.error("POST /api/inventory", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  },
);

inventoryRouter.delete(
  "/units/:unitId",
  requireRole(canWriteInventory),
  async (req, res) => {
    try {
      const product = await deleteInventoryUnit(routeParam(req.params.unitId));
      if (!product) {
        res.status(404).json({ error: "Unit not found" });
        return;
      }
      res.json(product);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/inventory/units/:unitId", error);
      res.status(500).json({ error: "Failed to remove unit" });
    }
  },
);

inventoryRouter.patch(
  "/:id",
  requireRole(canWriteInventory),
  async (req, res) => {
    try {
      const product = await updateProduct(
        routeParam(req.params.id),
        req.body as UpdateProductInput,
      );
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(product);
    } catch (error) {
      console.error("PATCH /api/inventory/:id", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  },
);

inventoryRouter.delete(
  "/:id",
  requireRole(canDeleteProduct),
  async (req, res) => {
    try {
      const deleted = await deleteProduct(routeParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/inventory/:id", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  },
);

inventoryRouter.post(
  "/:id/units",
  requireRole(canWriteInventory),
  async (req, res) => {
    try {
      const quantity = Number(req.body.quantity);
      if (!quantity || quantity < 1) {
        res.status(400).json({ error: "Quantity must be at least 1" });
        return;
      }

      const product = await addQuantityToProduct(
        routeParam(req.params.id),
        quantity,
      );
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      res.json(product);
    } catch (error) {
      console.error("POST /api/inventory/:id/units", error);
      res.status(500).json({ error: "Failed to add units" });
    }
  },
);
