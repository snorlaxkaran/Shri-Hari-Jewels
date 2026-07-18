import { Router } from "express";
import { canManageAccounting } from "../lib/auth/permissions.js";
import {
  createVendor,
  listVendors,
  updateVendor,
  VendorError,
} from "../lib/vendors/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { routeParam } from "../lib/route-param.js";
import type { NewVendorInput, UpdateVendorInput } from "../types.js";

export const vendorsRouter = Router();

vendorsRouter.use(authenticate);
vendorsRouter.use(attachOrganization);

vendorsRouter.get("/", requireRole(canManageAccounting), async (req: AuthenticatedRequest, res) => {
  try {
    const vendors = await listVendors(req.organizationId!);
    res.json(vendors);
  } catch (error) {
    console.error("GET /api/vendors", error);
    res.status(500).json({ error: "Failed to fetch vendors" });
  }
});

vendorsRouter.post("/", requireRole(canManageAccounting), async (req: AuthenticatedRequest, res) => {
  try {
    const vendor = await createVendor(req.organizationId!, req.body as NewVendorInput);
    res.status(201).json(vendor);
  } catch (error) {
    if (error instanceof VendorError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/vendors", error);
    res.status(500).json({ error: "Failed to create vendor" });
  }
});

vendorsRouter.patch(
  "/:id",
  requireRole(canManageAccounting),
  async (req: AuthenticatedRequest, res) => {
    try {
      const vendor = await updateVendor(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as UpdateVendorInput,
      );
      res.json(vendor);
    } catch (error) {
      if (error instanceof VendorError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/vendors/:id", error);
      res.status(500).json({ error: "Failed to update vendor" });
    }
  },
);
