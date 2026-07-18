import { Router } from "express";
import {
  getAgeingStockReport,
  getCadReport,
  getCategoryReport,
  getCustomerReport,
  getDepartmentReport,
  getGstReport,
  getLocationWiseReport,
  getStaffPerformanceReport,
  getStockSnapshotReport,
  getStockValuationReport,
  resolveReportBranchScope,
  type ReportQueryFilters,
} from "../lib/reports/service.js";
import { buildReportTable, isReportKey } from "../lib/reports/export-data.js";
import { generateReportPdf } from "../lib/reports/report-pdf.js";
import { sendEmailWithAttachment, isEmailConfigured } from "../lib/email/service.js";
import { getShopSettings } from "../lib/settings/service.js";
import { canManageCustomers } from "../lib/auth/permissions.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";
import { prisma } from "../lib/db.js";

const parseDateRange = (req: AuthenticatedRequest): { from: Date; to: Date } => {
  const bodyFilters =
    req.body?.filters && typeof req.body.filters === "object"
      ? (req.body.filters as { from?: string; to?: string })
      : {};

  const fromStr =
    typeof req.query.from === "string"
      ? req.query.from
      : typeof bodyFilters.from === "string"
        ? bodyFilters.from
        : undefined;
  const toStr =
    typeof req.query.to === "string"
      ? req.query.to
      : typeof bodyFilters.to === "string"
        ? bodyFilters.to
        : undefined;

  const to = toStr ? new Date(toStr) : new Date();
  const from = fromStr
    ? new Date(fromStr)
    : new Date(to.getFullYear(), to.getMonth(), 1);
  return { from, to };
};

const parseReportFilters = (req: AuthenticatedRequest): ReportQueryFilters => {
  const bodyFilters =
    req.body?.filters && typeof req.body.filters === "object"
      ? (req.body.filters as ReportQueryFilters)
      : {};

  return {
    branchId:
      typeof req.query.branchId === "string"
        ? req.query.branchId
        : bodyFilters.branchId,
    category:
      typeof req.query.category === "string"
        ? req.query.category
        : bodyFilters.category,
    department:
      typeof req.query.department === "string"
        ? req.query.department
        : bodyFilters.department,
    customerId:
      typeof req.query.customerId === "string"
        ? req.query.customerId
        : bodyFilters.customerId,
    groupBySku:
      req.query.groupBySku === "true" || bodyFilters.groupBySku === true,
    minDays: req.query.minDays
      ? Number(req.query.minDays)
      : bodyFilters.minDays,
  };
};

const resolveBranchId = async (
  req: AuthenticatedRequest,
  filters: ReportQueryFilters,
): Promise<string | undefined> => {
  const scoped = await resolveReportBranchScope(
    req.user!.id,
    req.user!.role,
    req.organizationId!,
  );
  return scoped ?? filters.branchId;
};

const buildFilterLabels = async (
  organizationId: string,
  filters: ReportQueryFilters,
  from: Date,
  to: Date,
): Promise<Record<string, string | undefined>> => {
  const labels: Record<string, string | undefined> = {
    from: from.toLocaleDateString("en-IN"),
    to: to.toLocaleDateString("en-IN"),
    category: filters.category,
    department: filters.department,
    groupBySku: filters.groupBySku ? "Yes" : undefined,
  };

  if (filters.branchId) {
    const branch = await prisma.branch.findFirst({
      where: { id: filters.branchId, organizationId },
      select: { name: true },
    });
    labels.branch = branch?.name;
  }

  if (filters.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: filters.customerId, organizationId },
      select: { name: true },
    });
    labels.customer = customer?.name;
  }

  return labels;
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
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);
      const report = await getGstReport(req.organizationId!, from, to, branchId, filters);
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
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);
      const report = await getStockValuationReport(req.organizationId!, branchId, filters);
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
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);
      const report = await getStaffPerformanceReport(
        req.organizationId!,
        from,
        to,
        branchId,
        filters,
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
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);
      const items = await getAgeingStockReport(
        req.organizationId!,
        Number.isFinite(minDays) ? minDays : 90,
        branchId,
        filters,
      );
      res.json({ minDays, items });
    } catch (error) {
      console.error("GET /api/reports/ageing-stock", error);
      res.status(500).json({ error: "Failed to generate ageing stock report." });
    }
  },
);

reportsRouter.get(
  "/category",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { from, to } = parseDateRange(req);
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);
      const report = await getCategoryReport(req.organizationId!, from, to, branchId, filters);
      res.json(report);
    } catch (error) {
      console.error("GET /api/reports/category", error);
      res.status(500).json({ error: "Failed to generate category report." });
    }
  },
);

reportsRouter.get(
  "/department",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { from, to } = parseDateRange(req);
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);
      const report = await getDepartmentReport(req.organizationId!, from, to, branchId, filters);
      res.json(report);
    } catch (error) {
      console.error("GET /api/reports/department", error);
      res.status(500).json({ error: "Failed to generate department report." });
    }
  },
);

reportsRouter.get(
  "/customer",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { from, to } = parseDateRange(req);
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);
      const report = await getCustomerReport(req.organizationId!, from, to, branchId, filters);
      res.json(report);
    } catch (error) {
      console.error("GET /api/reports/customer", error);
      res.status(500).json({ error: "Failed to generate customer report." });
    }
  },
);

reportsRouter.get(
  "/location-wise",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { from, to } = parseDateRange(req);
      const filters = parseReportFilters(req);
      const report = await getLocationWiseReport(req.organizationId!, from, to, filters);
      res.json(report);
    } catch (error) {
      console.error("GET /api/reports/location-wise", error);
      res.status(500).json({ error: "Failed to generate location-wise report." });
    }
  },
);

reportsRouter.get(
  "/cad",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);
      const report = await getCadReport(req.organizationId!, branchId, filters);
      res.json(report);
    } catch (error) {
      console.error("GET /api/reports/cad", error);
      res.status(500).json({ error: "Failed to generate CAD report." });
    }
  },
);

reportsRouter.get(
  "/stock-report",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);
      const report = await getStockSnapshotReport(req.organizationId!, branchId, filters);
      res.json(report);
    } catch (error) {
      console.error("GET /api/reports/stock-report", error);
      res.status(500).json({ error: "Failed to generate stock report." });
    }
  },
);

reportsRouter.post(
  "/:reportKey/pdf",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const reportKeyRaw = req.params.reportKey;
      const reportKey = Array.isArray(reportKeyRaw) ? reportKeyRaw[0] : reportKeyRaw;
      if (!reportKey || !isReportKey(reportKey)) {
        res.status(404).json({ error: "Report not found." });
        return;
      }

      const { from, to } = parseDateRange(req);
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);

      const table = await buildReportTable(reportKey, {
        organizationId: req.organizationId!,
        from,
        to,
        branchId,
        filters,
      });

      const settings = await getShopSettings(req.organizationId!);
      const filterLabels = await buildFilterLabels(
        req.organizationId!,
        { ...filters, branchId: branchId ?? filters.branchId },
        from,
        to,
      );

      const pdf = await generateReportPdf(
        table.title,
        table.columns,
        table.rows,
        filterLabels,
        settings,
      );

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${table.filename}.pdf"`,
      );
      res.send(pdf);
    } catch (error) {
      console.error("POST /api/reports/:reportKey/pdf", error);
      res.status(500).json({ error: "Failed to generate report PDF." });
    }
  },
);

reportsRouter.post(
  "/:reportKey/email",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!isEmailConfigured()) {
        res.status(503).json({
          error: "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
        });
        return;
      }

      const reportKeyRaw = req.params.reportKey;
      const reportKey = Array.isArray(reportKeyRaw) ? reportKeyRaw[0] : reportKeyRaw;
      if (!reportKey || !isReportKey(reportKey)) {
        res.status(404).json({ error: "Report not found." });
        return;
      }

      const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
      if (!to || !to.includes("@")) {
        res.status(400).json({ error: "A valid recipient email is required." });
        return;
      }

      const { from, to: toDate } = parseDateRange(req);
      const filters = parseReportFilters(req);
      const branchId = await resolveBranchId(req, filters);

      const table = await buildReportTable(reportKey, {
        organizationId: req.organizationId!,
        from,
        to: toDate,
        branchId,
        filters,
      });

      const settings = await getShopSettings(req.organizationId!);
      const filterLabels = await buildFilterLabels(
        req.organizationId!,
        { ...filters, branchId: branchId ?? filters.branchId },
        from,
        toDate,
      );

      const pdf = await generateReportPdf(
        table.title,
        table.columns,
        table.rows,
        filterLabels,
        settings,
      );

      await sendEmailWithAttachment(
        to,
        `${settings.businessName} — ${table.title}`,
        `Please find attached the ${table.title} generated from ${settings.businessName}.`,
        pdf,
        `${table.filename}.pdf`,
      );

      res.json({ ok: true });
    } catch (error) {
      console.error("POST /api/reports/:reportKey/email", error);
      const message =
        error instanceof Error ? error.message : "Failed to email report.";
      res.status(500).json({ error: message });
    }
  },
);
