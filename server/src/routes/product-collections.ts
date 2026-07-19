import { Router } from "express";
import { canReadInventory, canWriteInventory } from "../lib/auth/permissions.js";
import {
  createProductCollection,
  listProductCollections,
  ProductCollectionError,
} from "../lib/product-collections/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import type { NewProductCollectionInput } from "../types.js";

export const productCollectionsRouter = Router();

productCollectionsRouter.use(authenticate);
productCollectionsRouter.use(attachOrganization);

productCollectionsRouter.get(
  "/",
  requireRole(canReadInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const activeOnly = req.query.activeOnly !== "false";
      const collections = await listProductCollections(req.organizationId!, activeOnly);
      res.json(collections);
    } catch (error) {
      console.error("GET /api/product-collections", error);
      res.status(500).json({ error: "Failed to fetch collections" });
    }
  },
);

productCollectionsRouter.post(
  "/",
  requireRole(canWriteInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const collection = await createProductCollection(
        req.organizationId!,
        req.body as NewProductCollectionInput,
      );
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof ProductCollectionError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/product-collections", error);
      res.status(500).json({ error: "Failed to create collection" });
    }
  },
);
