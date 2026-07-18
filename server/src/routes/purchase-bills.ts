import { Router } from "express";
import { canManageAccounting } from "../lib/auth/permissions.js";
import {
  createPurchaseBill,
  listPurchaseBills,
  PurchaseBillError,
} from "../lib/purchase-bills/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import type { NewPurchaseBillInput } from "../types.js";

export const purchaseBillsRouter = Router();

purchaseBillsRouter.use(authenticate);
purchaseBillsRouter.use(attachOrganization);

purchaseBillsRouter.get(
  "/",
  requireRole(canManageAccounting),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const bills = await listPurchaseBills(req.organizationId!, branchId);
      res.json(bills);
    } catch (error) {
      console.error("GET /api/purchase-bills", error);
      res.status(500).json({ error: "Failed to fetch purchase bills" });
    }
  },
);

purchaseBillsRouter.post(
  "/",
  requireRole(canManageAccounting),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const bill = await createPurchaseBill(
        req.organizationId!,
        branchId,
        req.body as NewPurchaseBillInput,
      );
      res.status(201).json(bill);
    } catch (error) {
      if (error instanceof PurchaseBillError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/purchase-bills", error);
      res.status(500).json({ error: "Failed to create purchase bill" });
    }
  },
);
