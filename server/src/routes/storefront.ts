import { Router } from "express";
import rateLimit from "express-rate-limit";
import {
  getStorefrontCategories,
  getStorefrontCollection,
  getStorefrontConfig,
  getStorefrontProduct,
  getStorefrontStatus,
  getWebOrderByNo,
  listStorefrontCollections,
  listStorefrontProducts,
  placeWebOrder,
  type CheckoutInput,
  type StorefrontProductFilters,
} from "../lib/storefront/service.js";
import {
  resolveTenantByHost,
  resolveTenantBySlug,
  StorefrontError,
} from "../lib/storefront/resolve-tenant.js";
import { routeParam } from "../lib/route-param.js";

export const storefrontRouter = Router();

const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please try again shortly." },
});

const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many checkout attempts. Please wait a moment." },
});

storefrontRouter.use(publicLimiter);

const resolveTenant = async (
  slug: string,
  host?: string,
): Promise<{ organizationId: string; slug: string } | null> => {
  if (host) {
    const byHost = await resolveTenantByHost(host);
    if (byHost?.active) {
      return { organizationId: byHost.organizationId, slug: byHost.slug };
    }
  }

  const tenant = await resolveTenantBySlug(slug);
  if (!tenant?.active) return null;
  return { organizationId: tenant.organizationId, slug: tenant.slug };
};

storefrontRouter.get("/:slug/status", async (req, res) => {
  try {
    const status = await getStorefrontStatus(routeParam(req.params.slug));
    res.json(status);
  } catch (error) {
    console.error("GET /api/storefront/:slug/status", error);
    res.status(500).json({ error: "Failed to load store status." });
  }
});

storefrontRouter.get("/:slug/config", async (req, res) => {
  try {
    const tenant = await resolveTenant(
      routeParam(req.params.slug),
      req.headers["x-storefront-host"] as string | undefined,
    );
    if (!tenant) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    const config = await getStorefrontConfig(tenant.organizationId);
    res.json(config);
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/storefront/:slug/config", error);
    res.status(500).json({ error: "Failed to load store." });
  }
});

storefrontRouter.get("/:slug/products", async (req, res) => {
  try {
    const tenant = await resolveTenant(routeParam(req.params.slug));
    if (!tenant) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    const filters: StorefrontProductFilters = {
      category: req.query.category as string | undefined,
      metal: req.query.metal as string | undefined,
      search: req.query.search as string | undefined,
      collection: req.query.collection as string | undefined,
      sortBy: req.query.sortBy as StorefrontProductFilters["sortBy"],
      sortOrder: req.query.sortOrder as StorefrontProductFilters["sortOrder"],
      page: req.query.page ? Number(req.query.page) : undefined,
      limit: req.query.limit ? Number(req.query.limit) : undefined,
    };

    const result = await listStorefrontProducts(tenant.organizationId, filters);
    res.json(result);
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/storefront/:slug/products", error);
    res.status(500).json({ error: "Failed to load products." });
  }
});

storefrontRouter.get("/:slug/products/:productId", async (req, res) => {
  try {
    const tenant = await resolveTenant(routeParam(req.params.slug));
    if (!tenant) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    const product = await getStorefrontProduct(
      tenant.organizationId,
      routeParam(req.params.productId),
    );
    res.json(product);
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/storefront/:slug/products/:productId", error);
    res.status(500).json({ error: "Failed to load product." });
  }
});

storefrontRouter.get("/:slug/collections", async (req, res) => {
  try {
    const tenant = await resolveTenant(routeParam(req.params.slug));
    if (!tenant) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    const includeProducts = req.query.includeProducts === "true";
    const collections = await listStorefrontCollections(
      tenant.organizationId,
      includeProducts,
    );
    res.json(collections);
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/storefront/:slug/collections", error);
    res.status(500).json({ error: "Failed to load collections." });
  }
});

storefrontRouter.get("/:slug/collections/:collectionSlug", async (req, res) => {
  try {
    const tenant = await resolveTenant(routeParam(req.params.slug));
    if (!tenant) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    const collection = await getStorefrontCollection(
      tenant.organizationId,
      routeParam(req.params.collectionSlug),
    );
    res.json(collection);
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/storefront/:slug/collections/:collectionSlug", error);
    res.status(500).json({ error: "Failed to load collection." });
  }
});

storefrontRouter.get("/:slug/categories", async (req, res) => {
  try {
    const tenant = await resolveTenant(routeParam(req.params.slug));
    if (!tenant) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    const categories = await getStorefrontCategories(tenant.organizationId);
    res.json(categories);
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/storefront/:slug/categories", error);
    res.status(500).json({ error: "Failed to load categories." });
  }
});

storefrontRouter.post("/:slug/checkout", checkoutLimiter, async (req, res) => {
  try {
    const tenant = await resolveTenant(routeParam(req.params.slug));
    if (!tenant) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    const order = await placeWebOrder(
      tenant.organizationId,
      req.body as CheckoutInput,
    );
    res.status(201).json(order);
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/storefront/:slug/checkout", error);
    res.status(500).json({ error: "Failed to place order." });
  }
});

storefrontRouter.get("/:slug/orders/:orderNo", async (req, res) => {
  try {
    const tenant = await resolveTenant(routeParam(req.params.slug));
    if (!tenant) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    const order = await getWebOrderByNo(
      tenant.organizationId,
      routeParam(req.params.orderNo),
    );
    res.json(order);
  } catch (error) {
    if (error instanceof StorefrontError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/storefront/:slug/orders/:orderNo", error);
    res.status(500).json({ error: "Failed to load order." });
  }
});

storefrontRouter.get("/resolve", async (req, res) => {
  try {
    const host = (req.query.host as string)?.trim();
    if (!host) {
      res.status(400).json({ error: "Host is required." });
      return;
    }

    const tenant = await resolveTenantByHost(host);
    if (!tenant?.active) {
      res.status(404).json({ error: "Store not found." });
      return;
    }

    res.json({ slug: tenant.slug, name: tenant.name });
  } catch (error) {
    console.error("GET /api/storefront/resolve", error);
    res.status(500).json({ error: "Failed to resolve store." });
  }
});
