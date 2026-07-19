import { Router } from "express";
import {
  canManagePayroll,
  canViewPayroll,
  canMarkOwnAttendance,
} from "../lib/auth/permissions.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope, assertUserHasBranchAccess } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";
import {
  listEmployees,
  createEmployee,
  updateEmployee,
  getEmployeeByUserId,
  EmployeeError,
} from "../lib/hr/employee-service.js";
import {
  getAttendanceGrid,
  markAttendance,
  bulkMarkAttendance,
  AttendanceError,
} from "../lib/hr/attendance-service.js";
import {
  listPayrollRuns,
  getPayrollRun,
  createPayrollRun,
  updatePayslipItem,
  finalizePayrollRun,
  markPayrollRunPaid,
  getPayslipPdfBuffer,
  getPayrollAttendancePreview,
  PayrollError,
} from "../lib/hr/payroll-service.js";
import {
  isEmailConfigured,
  sendEmailWithAttachment,
} from "../lib/email/service.js";
import { getShopSettings } from "../lib/settings/service.js";
import type {
  NewEmployeeInput,
  UpdateEmployeeInput,
  MarkAttendanceInput,
  BulkMarkAttendanceInput,
  NewPayrollRunInput,
  UpdatePayslipItemInput,
} from "../types.js";

export const employeesRouter = Router();
export const attendanceRouter = Router();
export const payrollRunsRouter = Router();

const useOrg = (router: Router) => {
  router.use(authenticate);
  router.use(attachOrganization);
};

useOrg(employeesRouter);
useOrg(attendanceRouter);
useOrg(payrollRunsRouter);

const handleHrError = (
  res: import("express").Response,
  error: unknown,
  label: string,
) => {
  if (
    error instanceof EmployeeError ||
    error instanceof AttendanceError ||
    error instanceof PayrollError
  ) {
    res.status(error.statusCode).json({ error: error.message });
    return;
  }
  console.error(label, error);
  res.status(500).json({ error: "Request failed." });
};

// --- Employees ---

employeesRouter.get(
  "/",
  requireRole(canViewPayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const branchFilter =
        typeof req.query.branchId === "string"
          ? req.query.branchId
          : branchId;
      if (branchFilter) {
        await assertUserHasBranchAccess(
          req.user!.id,
          req.organizationId!,
          branchFilter,
          req.user!.role,
        );
      }
      const employees = await listEmployees(
        req.organizationId!,
        branchFilter,
      );
      res.json(employees);
    } catch (error) {
      handleHrError(res, error, "GET /api/employees");
    }
  },
);

employeesRouter.get(
  "/me",
  requireRole(canMarkOwnAttendance),
  async (req: AuthenticatedRequest, res) => {
    try {
      const employee = await getEmployeeByUserId(
        req.user!.id,
        req.organizationId!,
      );
      res.json(employee);
    } catch (error) {
      handleHrError(res, error, "GET /api/employees/me");
    }
  },
);

employeesRouter.post(
  "/",
  requireRole(canManagePayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as NewEmployeeInput;
      await assertUserHasBranchAccess(
        req.user!.id,
        req.organizationId!,
        input.branchId,
        req.user!.role,
      );
      const employee = await createEmployee(input, req.organizationId!);
      res.status(201).json(employee);
    } catch (error) {
      handleHrError(res, error, "POST /api/employees");
    }
  },
);

employeesRouter.patch(
  "/:id",
  requireRole(canManagePayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = routeParam(req.params.id);
      const input = req.body as UpdateEmployeeInput;
      if (input.branchId) {
        await assertUserHasBranchAccess(
          req.user!.id,
          req.organizationId!,
          input.branchId,
          req.user!.role,
        );
      }
      const employee = await updateEmployee(
        id,
        input,
        req.organizationId!,
      );
      res.json(employee);
    } catch (error) {
      handleHrError(res, error, "PATCH /api/employees/:id");
    }
  },
);

// --- Attendance ---

attendanceRouter.get(
  "/",
  requireRole(canViewPayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      const branchId =
        typeof req.query.branchId === "string"
          ? req.query.branchId
          : undefined;

      if (!month || !year || !branchId) {
        res.status(400).json({ error: "month, year, and branchId are required." });
        return;
      }

      await assertUserHasBranchAccess(
        req.user!.id,
        req.organizationId!,
        branchId,
        req.user!.role,
      );

      const grid = await getAttendanceGrid(
        req.organizationId!,
        branchId,
        month,
        year,
      );
      res.json(grid);
    } catch (error) {
      handleHrError(res, error, "GET /api/attendance");
    }
  },
);

attendanceRouter.post(
  "/mark",
  requireRole((role) => canViewPayroll(role) || canMarkOwnAttendance(role)),
  async (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as MarkAttendanceInput;
      const admin = canManagePayroll(req.user!.role);
      const record = await markAttendance(
        input,
        req.organizationId!,
        req.user!.name,
        admin ? undefined : req.user!.id,
      );
      res.json(record);
    } catch (error) {
      handleHrError(res, error, "POST /api/attendance/mark");
    }
  },
);

attendanceRouter.post(
  "/bulk-mark",
  requireRole(canManagePayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as BulkMarkAttendanceInput;
      const count = await bulkMarkAttendance(
        input,
        req.organizationId!,
        req.user!.name,
      );
      res.json({ count });
    } catch (error) {
      handleHrError(res, error, "POST /api/attendance/bulk-mark");
    }
  },
);

// --- Payroll runs ---

payrollRunsRouter.get(
  "/",
  requireRole(canViewPayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const branchFilter =
        typeof req.query.branchId === "string"
          ? req.query.branchId
          : branchId;
      const runs = await listPayrollRuns(
        req.organizationId!,
        branchFilter,
      );
      res.json(runs);
    } catch (error) {
      handleHrError(res, error, "GET /api/payroll-runs");
    }
  },
);

payrollRunsRouter.get(
  "/preview-attendance",
  requireRole(canManagePayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const month = Number(req.query.month);
      const year = Number(req.query.year);
      const branchId =
        typeof req.query.branchId === "string"
          ? req.query.branchId
          : undefined;

      if (!month || !year || !branchId) {
        res.status(400).json({ error: "month, year, and branchId are required." });
        return;
      }

      const preview = await getPayrollAttendancePreview(
        req.organizationId!,
        branchId,
        month,
        year,
      );
      res.json(preview);
    } catch (error) {
      handleHrError(res, error, "GET /api/payroll-runs/preview-attendance");
    }
  },
);

payrollRunsRouter.get(
  "/:id",
  requireRole(canViewPayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = routeParam(req.params.id);
      const run = await getPayrollRun(id, req.organizationId!);
      res.json(run);
    } catch (error) {
      handleHrError(res, error, "GET /api/payroll-runs/:id");
    }
  },
);

payrollRunsRouter.post(
  "/",
  requireRole(canManagePayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as NewPayrollRunInput;
      await assertUserHasBranchAccess(
        req.user!.id,
        req.organizationId!,
        input.branchId,
        req.user!.role,
      );
      const run = await createPayrollRun(
        input,
        req.organizationId!,
        req.user!.name,
      );
      res.status(201).json(run);
    } catch (error) {
      handleHrError(res, error, "POST /api/payroll-runs");
    }
  },
);

payrollRunsRouter.patch(
  "/:id/items/:itemId",
  requireRole(canManagePayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = routeParam(req.params.id);
      const itemId = routeParam(req.params.itemId);
      const input = req.body as UpdatePayslipItemInput;
      const run = await updatePayslipItem(
        id,
        itemId,
        input,
        req.organizationId!,
      );
      res.json(run);
    } catch (error) {
      handleHrError(res, error, "PATCH /api/payroll-runs/:id/items/:itemId");
    }
  },
);

payrollRunsRouter.post(
  "/:id/finalize",
  requireRole(canManagePayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = routeParam(req.params.id);
      const run = await finalizePayrollRun(id, req.organizationId!);
      res.json(run);
    } catch (error) {
      handleHrError(res, error, "POST /api/payroll-runs/:id/finalize");
    }
  },
);

payrollRunsRouter.post(
  "/:id/mark-paid",
  requireRole(canManagePayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = routeParam(req.params.id);
      const run = await markPayrollRunPaid(id, req.organizationId!);
      res.json(run);
    } catch (error) {
      handleHrError(res, error, "POST /api/payroll-runs/:id/mark-paid");
    }
  },
);

payrollRunsRouter.get(
  "/:id/items/:itemId/pdf",
  requireRole(canViewPayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = routeParam(req.params.id);
      const itemId = routeParam(req.params.itemId);
      const pdf = await getPayslipPdfBuffer(
        id,
        itemId,
        req.organizationId!,
      );
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="payslip-${itemId.slice(0, 8)}.pdf"`,
      );
      res.send(pdf);
    } catch (error) {
      handleHrError(res, error, "GET /api/payroll-runs/:id/items/:itemId/pdf");
    }
  },
);

payrollRunsRouter.post(
  "/:id/items/:itemId/email-payslip",
  requireRole(canManagePayroll),
  async (req: AuthenticatedRequest, res) => {
    try {
      if (!isEmailConfigured()) {
        res.status(503).json({
          error: "Email is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS.",
        });
        return;
      }

      const to = typeof req.body?.to === "string" ? req.body.to.trim() : "";
      if (!to || !to.includes("@")) {
        res.status(400).json({ error: "A valid recipient email is required." });
        return;
      }

      const id = routeParam(req.params.id);
      const itemId = routeParam(req.params.itemId);
      const pdf = await getPayslipPdfBuffer(
        id,
        itemId,
        req.organizationId!,
      );
      const settings = await getShopSettings(req.organizationId!);
      const run = await getPayrollRun(id, req.organizationId!);
      const item = run.items?.find((i) => i.id === itemId);
      const monthNames = [
        "January", "February", "March", "April", "May", "June",
        "July", "August", "September", "October", "November", "December",
      ];
      const period = `${monthNames[run.month - 1]} ${run.year}`;

      await sendEmailWithAttachment(
        to,
        `${settings.businessName} — Payslip for ${period}`,
        `Please find attached your payslip for ${period} from ${settings.businessName}.`,
        pdf,
        `payslip-${period.replace(/\s+/g, "-")}.pdf`,
      );

      res.json({ ok: true });
    } catch (error) {
      handleHrError(
        res,
        error,
        "POST /api/payroll-runs/:id/items/:itemId/email-payslip",
      );
    }
  },
);
