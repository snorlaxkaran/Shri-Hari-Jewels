import { EntryVoucherStatus } from "@prisma/client";
import { Router } from "express";
import {
  canReadInventory,
  canWriteInventory,
} from "../lib/auth/permissions.js";
import { InventoryError } from "../lib/inventory/service.js";
import {
  deleteEntryVoucher,
  getEntryVoucherById,
  listEntryVouchers,
  updateEntryVoucherPrices,
  verifyEntryVoucher,
} from "../lib/inventory/vouchers-service.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";

export const entryVouchersRouter = Router();

entryVouchersRouter.use(authenticate);
entryVouchersRouter.use(attachOrganization);

entryVouchersRouter.get(
  "/",
  requireRole(canReadInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const statusParam =
        typeof req.query.status === "string" ? req.query.status : undefined;
      const status =
        statusParam === "Pending" || statusParam === "Verified"
          ? (statusParam as EntryVoucherStatus)
          : undefined;

      const vouchers = await listEntryVouchers(
        req.organizationId!,
        req.user!.role === "Admin" ? undefined : branchId,
        status,
      );
      res.json(vouchers);
    } catch (error) {
      console.error("GET /api/entry-vouchers", error);
      res.status(500).json({ error: "Failed to fetch entry vouchers" });
    }
  },
);

entryVouchersRouter.get(
  "/:id",
  requireRole(canReadInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const voucher = await getEntryVoucherById(
        routeParam(req.params.id),
        req.organizationId!,
      );
      if (!voucher) {
        res.status(404).json({ error: "Voucher not found" });
        return;
      }
      res.json(voucher);
    } catch (error) {
      console.error("GET /api/entry-vouchers/:id", error);
      res.status(500).json({ error: "Failed to fetch voucher" });
    }
  },
);

entryVouchersRouter.patch(
  "/:id/prices",
  requireRole(canWriteInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const prices = Array.isArray(req.body?.prices) ? req.body.prices : [];
      const voucher = await updateEntryVoucherPrices(
        routeParam(req.params.id),
        req.organizationId!,
        prices,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(voucher);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/entry-vouchers/:id/prices", error);
      res.status(500).json({ error: "Failed to update prices" });
    }
  },
);

entryVouchersRouter.post(
  "/:id/verify",
  requireRole(canWriteInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const result = await verifyEntryVoucher(
        routeParam(req.params.id),
        req.organizationId!,
        { id: req.user!.id, name: req.user!.name },
      );
      if (!result.ok) {
        res.status(400).json({
          error: "All items must have a price before verification.",
          missingPrices: result.missingPrices,
        });
        return;
      }
      res.json(result.voucher);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/entry-vouchers/:id/verify", error);
      res.status(500).json({ error: "Failed to verify voucher" });
    }
  },
);

entryVouchersRouter.delete(
  "/:id",
  requireRole(canWriteInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      await deleteEntryVoucher(
        routeParam(req.params.id),
        req.organizationId!,
        { id: req.user!.id, name: req.user!.name },
      );
      res.status(204).send();
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/entry-vouchers/:id", error);
      res.status(500).json({ error: "Failed to delete voucher" });
    }
  },
);
