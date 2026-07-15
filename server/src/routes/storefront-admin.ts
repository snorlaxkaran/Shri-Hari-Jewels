import { Router } from "express";
import { canManageSettings, canManageStorefront } from "../lib/auth/permissions.js";
import {
  bulkSetProductsPublished,
  createCollection,
  deleteCollection,
  getAdminStorefrontSettings,
  getStorefrontStats,
  listAdminCollections,
  listPublishableProducts,
  listWebOrders,
  setCollectionProducts,
  setProductPublished,
  updateAdminStorefrontSettings,
  updateCollection,
  updateCustomDomain,
  updateWebOrder,
  type CreateCollectionInput,
  type UpdateStorefrontSettingsInput,
  type UpdateWebOrderInput,
} from "../lib/storefront/admin-service.js";
import { StorefrontError } from "../lib/storefront/resolve-tenant.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { routeParam } from "../lib/route-param.js";

export const storefrontAdminRouter = Router();

storefrontAdminRouter.use(authenticate);
storefrontAdminRouter.use(attachOrganization);

storefrontAdminRouter.get("/settings", async (req: AuthenticatedRequest, res) => {
  try {
    const settings = await getAdminStorefrontSettings(req.organizationId!);
    res.json(settings);
  } catch (error) {
    console.error("GET /api/storefront-admin/settings", error);
    res.status(500).json({ error: "Failed to load storefront settings." });
  }
});

storefrontAdminRouter.patch(
  "/settings",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const settings = await updateAdminStorefrontSettings(
        req.organizationId!,
        req.body as UpdateStorefrontSettingsInput,
      );
      res.json(settings);
    } catch (error) {
      if (error instanceof StorefrontError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/storefront-admin/settings", error);
      res.status(500).json({ error: "Failed to update storefront settings." });
    }
  },
);

storefrontAdminRouter.patch(
  "/domain",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { customDomain } = req.body as { customDomain?: string | null };
      await updateCustomDomain(req.organizationId!, customDomain ?? null);
      const settings = await getAdminStorefrontSettings(req.organizationId!);
      res.json(settings);
    } catch (error) {
      if (error instanceof StorefrontError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/storefront-admin/domain", error);
      res.status(500).json({ error: "Failed to update custom domain." });
    }
  },
);

storefrontAdminRouter.get("/stats", async (req: AuthenticatedRequest, res) => {
  try {
    const stats = await getStorefrontStats(req.organizationId!);
    res.json(stats);
  } catch (error) {
    console.error("GET /api/storefront-admin/stats", error);
    res.status(500).json({ error: "Failed to load stats." });
  }
});

storefrontAdminRouter.get("/products", async (req: AuthenticatedRequest, res) => {
  try {
    const products = await listPublishableProducts(req.organizationId!);
    res.json(products);
  } catch (error) {
    console.error("GET /api/storefront-admin/products", error);
    res.status(500).json({ error: "Failed to load products." });
  }
});

storefrontAdminRouter.patch(
  "/products/:id/publish",
  requireRole(canManageStorefront),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { published, storefrontDescription } = req.body as {
        published: boolean;
        storefrontDescription?: string | null;
      };
      await setProductPublished(
        req.organizationId!,
        routeParam(req.params.id),
        published,
        storefrontDescription,
      );
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof StorefrontError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/storefront-admin/products/:id/publish", error);
      res.status(500).json({ error: "Failed to update product." });
    }
  },
);

storefrontAdminRouter.post(
  "/products/bulk-publish",
  requireRole(canManageStorefront),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { productIds, published } = req.body as {
        productIds: string[];
        published: boolean;
      };
      const count = await bulkSetProductsPublished(
        req.organizationId!,
        productIds ?? [],
        published ?? true,
      );
      res.json({ count });
    } catch (error) {
      console.error("POST /api/storefront-admin/products/bulk-publish", error);
      res.status(500).json({ error: "Failed to bulk update products." });
    }
  },
);

storefrontAdminRouter.get("/collections", async (req: AuthenticatedRequest, res) => {
  try {
    const collections = await listAdminCollections(req.organizationId!);
    res.json(collections);
  } catch (error) {
    console.error("GET /api/storefront-admin/collections", error);
    res.status(500).json({ error: "Failed to load collections." });
  }
});

storefrontAdminRouter.post(
  "/collections",
  requireRole(canManageStorefront),
  async (req: AuthenticatedRequest, res) => {
    try {
      const collection = await createCollection(
        req.organizationId!,
        req.body as CreateCollectionInput,
      );
      res.status(201).json(collection);
    } catch (error) {
      if (error instanceof StorefrontError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/storefront-admin/collections", error);
      res.status(500).json({ error: "Failed to create collection." });
    }
  },
);

storefrontAdminRouter.patch(
  "/collections/:id",
  requireRole(canManageStorefront),
  async (req: AuthenticatedRequest, res) => {
    try {
      const collection = await updateCollection(
        req.organizationId!,
        routeParam(req.params.id),
        req.body,
      );
      res.json(collection);
    } catch (error) {
      if (error instanceof StorefrontError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/storefront-admin/collections/:id", error);
      res.status(500).json({ error: "Failed to update collection." });
    }
  },
);

storefrontAdminRouter.delete(
  "/collections/:id",
  requireRole(canManageStorefront),
  async (req: AuthenticatedRequest, res) => {
    try {
      await deleteCollection(req.organizationId!, routeParam(req.params.id));
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof StorefrontError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/storefront-admin/collections/:id", error);
      res.status(500).json({ error: "Failed to delete collection." });
    }
  },
);

storefrontAdminRouter.put(
  "/collections/:id/products",
  requireRole(canManageStorefront),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { productIds } = req.body as { productIds: string[] };
      const collection = await setCollectionProducts(
        req.organizationId!,
        routeParam(req.params.id),
        productIds ?? [],
      );
      res.json(collection);
    } catch (error) {
      if (error instanceof StorefrontError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PUT /api/storefront-admin/collections/:id/products", error);
      res.status(500).json({ error: "Failed to update collection products." });
    }
  },
);

storefrontAdminRouter.get("/orders", async (req: AuthenticatedRequest, res) => {
  try {
    const orders = await listWebOrders(req.organizationId!);
    res.json(orders);
  } catch (error) {
    console.error("GET /api/storefront-admin/orders", error);
    res.status(500).json({ error: "Failed to load web orders." });
  }
});

storefrontAdminRouter.patch(
  "/orders/:id",
  requireRole(canManageStorefront),
  async (req: AuthenticatedRequest, res) => {
    try {
      const order = await updateWebOrder(
        req.organizationId!,
        routeParam(req.params.id),
        req.body as UpdateWebOrderInput,
      );
      res.json(order);
    } catch (error) {
      if (error instanceof StorefrontError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/storefront-admin/orders/:id", error);
      res.status(500).json({ error: "Failed to update order." });
    }
  },
);
