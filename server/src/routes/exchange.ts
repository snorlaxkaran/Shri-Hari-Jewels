import { Router } from "express";
import {
  ExchangeError,
  createExchangeTransaction,
  listExchangeTransactions,
} from "../lib/exchange/service.js";
import { canRecordSales } from "../lib/auth/permissions.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const exchangeRouter = Router();

exchangeRouter.get(
  "/",
  authenticate,
  requireOrganization,
  requireRole(canRecordSales),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const items = await listExchangeTransactions(req.organizationId!, branchId);
      res.json({ items });
    } catch (error) {
      console.error("GET /api/exchange", error);
      res.status(500).json({ error: "Failed to list exchange transactions." });
    }
  },
);

exchangeRouter.post(
  "/",
  authenticate,
  requireOrganization,
  requireRole(canRecordSales),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(
        req.user!.id,
        req.organizationId!,
        req.user!.role,
      );
      const body = req.body as Record<string, unknown>;
      const result = await createExchangeTransaction({
        organizationId: req.organizationId!,
        branchId,
        customerId: typeof body.customerId === "string" ? body.customerId : undefined,
        description: String(body.description ?? ""),
        metalType: String(body.metalType ?? "Gold"),
        purity: String(body.purity ?? "22K"),
        grossWeightGrams: Number(body.grossWeightGrams ?? 0),
        netWeightGrams: Number(body.netWeightGrams ?? 0),
        wastagePct: Number(body.wastagePct ?? 0),
        ratePerGram: Number(body.ratePerGram ?? 0),
        notes: typeof body.notes === "string" ? body.notes : undefined,
        actor: { id: req.user!.id, name: req.user!.name },
      });
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof ExchangeError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/exchange", error);
      res.status(500).json({ error: "Failed to create exchange transaction." });
    }
  },
);
