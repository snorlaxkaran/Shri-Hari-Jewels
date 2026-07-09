import { Router } from "express";
import {
  getAgeingStockReport,
  getGstReport,
  getStaffPerformanceReport,
  getStockValuationReport,
  resolveReportBranchScope,
} from "../lib/reports/service.js";
import { canManageCustomers } from "../lib/auth/permissions.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

const parseDateRange = (req: AuthenticatedRequest): { from: Date; to: Date } => {
  const fromStr = typeof req.query.from === "string" ? req.query.from : undefined;
  const toStr = typeof req.query.to === "string" ? req.query.to : undefined;
  const to = toStr ? new Date(toStr) : new Date();
  const from = fromStr
    ? new Date(fromStr)
    : new Date(to.getFullYear(), to.getMonth(), 1);
  return { from, to };
};

export const reportsRouter = Router();

reportsRouter.get(
  "/gst",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { from, to } = parseDateRange(req);
      const branchId = await resolveReportBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const report = await getGstReport(req.organizationId!, from, to, branchId);
      res.json(report);
    } catch (error) {
      console.error("GET /api/reports/gst", error);
      res.status(500).json({ error: "Failed to generate GST report." });
    }
  },
);

reportsRouter.get(
  "/stock-valuation",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await resolveReportBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const report = await getStockValuationReport(req.organizationId!, branchId);
      res.json(report);
    } catch (error) {
      console.error("GET /api/reports/stock-valuation", error);
      res.status(500).json({ error: "Failed to generate stock valuation report." });
    }
  },
);

reportsRouter.get(
  "/staff-performance",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { from, to } = parseDateRange(req);
      const branchId = await resolveReportBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const report = await getStaffPerformanceReport(
        req.organizationId!,
        from,
        to,
        branchId,
      );
      res.json({ period: { from: from.toISOString(), to: to.toISOString() }, staff: report });
    } catch (error) {
      console.error("GET /api/reports/staff-performance", error);
      res.status(500).json({ error: "Failed to generate staff performance report." });
    }
  },
);

reportsRouter.get(
  "/ageing-stock",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const minDays = Number(req.query.minDays ?? 90);
      const branchId = await resolveReportBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const items = await getAgeingStockReport(
        req.organizationId!,
        Number.isFinite(minDays) ? minDays : 90,
        branchId,
      );
      res.json({ minDays, items });
    } catch (error) {
      console.error("GET /api/reports/ageing-stock", error);
      res.status(500).json({ error: "Failed to generate ageing stock report." });
    }
  },
);
