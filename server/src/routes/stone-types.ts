import { Router } from "express";
import {
  StoneTypeError,
  createStoneType,
  listStoneTypes,
} from "../lib/stone-types/service.js";
import { canReadRawInventory, canWriteRawInventory } from "../lib/auth/permissions.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import type { NewStoneTypeInput } from "../types.js";

export const stoneTypesRouter = Router();

stoneTypesRouter.use(authenticate);
stoneTypesRouter.use(attachOrganization);

stoneTypesRouter.get("/", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const activeOnly = req.query.activeOnly !== "false";
    const types = await listStoneTypes(req.organizationId!, activeOnly);
    res.json(types);
  } catch (error) {
    console.error("GET /api/stone-types", error);
    res.status(500).json({ error: "Failed to fetch stone types" });
  }
});

stoneTypesRouter.post("/", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
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
