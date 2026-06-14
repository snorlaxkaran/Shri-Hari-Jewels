import { Router } from "express";
import { canRecordSales, canViewAnalytics } from "../lib/auth/permissions.js";
import { getSalesAnalytics } from "../lib/sales/analytics.js";
import { recordCartSale, syncPendingCartPayment } from "../lib/sales/cart.js";
import {
  cancelPendingSale,
  confirmSalePayment,
  listSales,
  lookupUnitForSale,
  recordSale,
  SaleError,
  syncPendingSalePayment,
} from "../lib/sales/service.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";
import type { RecordCartSaleInput, RecordSaleInput } from "../types.js";

export const salesRouter = Router();

salesRouter.use(authenticate);

salesRouter.get(
  "/analytics",
  requireRole(canViewAnalytics),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(req.user!.id, req.user!.role);
      const analytics = await getSalesAnalytics(branchId);
      res.json(analytics);
    } catch (error) {
      console.error("GET /api/sales/analytics", error);
      res.status(500).json({ error: "Failed to fetch sales analytics" });
    }
  },
);

salesRouter.get("/", requireRole(canRecordSales), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(req.user!.id, req.user!.role);
    const sales = await listSales(branchId);
    res.json(sales);
  } catch (error) {
    console.error("GET /api/sales", error);
    res.status(500).json({ error: "Failed to fetch sales" });
  }
});

salesRouter.get(
  "/lookup/:itemCode",
  requireRole(canRecordSales),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(req.user!.id, req.user!.role);
      const unit = await lookupUnitForSale(
        routeParam(req.params.itemCode),
        branchId,
      );
      res.json(unit);
    } catch (error) {
      if (error instanceof SaleError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/sales/lookup/:itemCode", error);
      res.status(500).json({ error: "Failed to look up item" });
    }
  },
);

salesRouter.post(
  "/",
  requireRole(canRecordSales),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id);
      const result = await recordSale(req.body as RecordSaleInput, branchId);
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof SaleError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/sales", error);
      res.status(500).json({ error: "Failed to record sale" });
    }
  },
);

salesRouter.post("/cart", requireRole(canRecordSales), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(req.user!.id, req.user!.role);
    const result = await recordCartSale(
      req.body as RecordCartSaleInput,
      branchId,
    );
    res.status(201).json(result);
  } catch (error) {
    if (error instanceof SaleError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/sales/cart", error);
    res.status(500).json({ error: "Failed to record cart sale" });
  }
});

salesRouter.get(
  "/:id/status",
  requireRole(canRecordSales),
  async (req, res) => {
    try {
      const saleId = routeParam(req.params.id);
      const sale = await prisma.sale.findUnique({ where: { id: saleId } });

      if (sale?.cartGroupId) {
        const result = await syncPendingCartPayment(saleId);
        res.json(result);
        return;
      }

      const result = await syncPendingSalePayment(saleId);
      res.json(result);
    } catch (error) {
      if (error instanceof SaleError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/sales/:id/status", error);
      res.status(500).json({ error: "Failed to check sale status" });
    }
  },
);

salesRouter.post(
  "/:id/confirm",
  requireRole(canRecordSales),
  async (req, res) => {
    try {
      const paymentRef =
        typeof req.body.paymentRef === "string"
          ? req.body.paymentRef
          : undefined;
      const result = await confirmSalePayment(
        routeParam(req.params.id),
        paymentRef,
      );
      res.json(result);
    } catch (error) {
      if (error instanceof SaleError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/sales/:id/confirm", error);
      res.status(500).json({ error: "Failed to confirm payment" });
    }
  },
);

salesRouter.post(
  "/:id/cancel",
  requireRole(canRecordSales),
  async (req, res) => {
    try {
      await cancelPendingSale(routeParam(req.params.id));
      res.status(204).send();
    } catch (error) {
      if (error instanceof SaleError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/sales/:id/cancel", error);
      res.status(500).json({ error: "Failed to cancel sale" });
    }
  },
);
