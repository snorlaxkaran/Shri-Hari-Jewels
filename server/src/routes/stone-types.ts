import { Router } from "express";
import {
  StoneTypeError,
  createStoneType,
  listStoneTypes,
  updateStoneType,
} from "../lib/stone-types/service.js";
import {
  canManageSettings,
  canReadInventory,
  canWriteInventory,
} from "../lib/auth/permissions.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { routeParam } from "../lib/route-param.js";
import type { NewStoneTypeInput, UpdateStoneTypeInput } from "../types.js";

export const stoneTypesRouter = Router();

stoneTypesRouter.use(authenticate);
stoneTypesRouter.use(attachOrganization);

stoneTypesRouter.get("/", requireRole(canReadInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const activeOnly = req.query.activeOnly !== "false";
    const types = await listStoneTypes(req.organizationId!, activeOnly);
    res.json(types);
  } catch (error) {
    console.error("GET /api/stone-types", error);
    res.status(500).json({ error: "Failed to fetch stone types" });
  }
});

stoneTypesRouter.post("/", requireRole(canWriteInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const type = await createStoneType(
      req.body as NewStoneTypeInput,
      req.organizationId!,
      req.user!.name,
    );
    res.status(201).json(type);
  } catch (error) {
    if (error instanceof StoneTypeError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-types", error);
    res.status(500).json({ error: "Failed to create stone type" });
  }
});

stoneTypesRouter.patch(
  "/:id",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const type = await updateStoneType(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as UpdateStoneTypeInput,
      );
      res.json(type);
    } catch (error) {
      if (error instanceof StoneTypeError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/stone-types/:id", error);
      res.status(500).json({ error: "Failed to update stone type" });
    }
  },
);
