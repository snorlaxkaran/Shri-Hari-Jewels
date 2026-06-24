import { Router } from "express";
import { StoneCategory } from "@prisma/client";
import {
  StoneMasterError,
  createStoneMaster,
  getStoneMaster,
  listStoneMasters,
  updateStoneMaster,
} from "../lib/stone-master/service.js";
import { canReadRawInventory, canWriteRawInventory } from "../lib/auth/permissions.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { routeParam } from "../lib/route-param.js";
import type { NewStoneMasterInput, UpdateStoneMasterInput } from "../types.js";

export const stoneMasterRouter = Router();

stoneMasterRouter.use(authenticate);
stoneMasterRouter.use(attachOrganization);

stoneMasterRouter.get("/", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const category = req.query.category as StoneCategory | undefined;
    const activeOnly = req.query.activeOnly === "true";
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const stones = await listStoneMasters(req.organizationId!, {
      category: category && Object.values(StoneCategory).includes(category)
        ? category
        : undefined,
      activeOnly,
      search,
    });
    res.json(stones);
  } catch (error) {
    console.error("GET /api/stone-master", error);
    res.status(500).json({ error: "Failed to fetch stone master catalog" });
  }
});

stoneMasterRouter.get("/:id", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const stone = await getStoneMaster(routeParam(req.params.id), req.organizationId!);
    res.json(stone);
  } catch (error) {
    if (error instanceof StoneMasterError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/stone-master/:id", error);
    res.status(500).json({ error: "Failed to fetch stone master entry" });
  }
});

stoneMasterRouter.post("/", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const stone = await createStoneMaster(
      req.body as NewStoneMasterInput,
      req.organizationId!,
      req.user!.name,
    );
    res.status(201).json(stone);
  } catch (error) {
    if (error instanceof StoneMasterError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-master", error);
    res.status(500).json({ error: "Failed to create stone master entry" });
  }
});

stoneMasterRouter.put("/:id", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const stone = await updateStoneMaster(
      routeParam(req.params.id),
      req.body as UpdateStoneMasterInput,
      req.organizationId!,
    );
    res.json(stone);
  } catch (error) {
    if (error instanceof StoneMasterError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("PUT /api/stone-master/:id", error);
    res.status(500).json({ error: "Failed to update stone master entry" });
  }
});
