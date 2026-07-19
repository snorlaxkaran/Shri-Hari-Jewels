import { Router } from "express";
import {
  canManageExpenses,
  canViewExpenses,
} from "../lib/auth/permissions.js";
import {
  approveExpense,
  attachExpenseReceipt,
  countPendingExpenses,
  createDirectExpense,
  createExpenseRequest,
  disburseExpense,
  ExpenseError,
  getExpenseReports,
  getPettyCashFloat,
  listExpenses,
  rejectExpense,
  replenishPettyCashFloat,
  setupPettyCashFloat,
} from "../lib/expenses/service.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import type {
  AttachExpenseReceiptInput,
  DirectExpenseInput,
  ExpenseCategory,
  ExpenseStatus,
  NewExpenseInput,
  RejectExpenseInput,
  SetupPettyCashFloatInput,
} from "../types.js";

export const expensesRouter = Router();
export const pettyCashFloatRouter = Router();

const useOrg = (router: Router) => {
  router.use(authenticate);
  router.use(attachOrganization);
};

useOrg(expensesRouter);
useOrg(pettyCashFloatRouter);

expensesRouter.get(
  "/pending-count",
  requireRole(canViewExpenses),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const count = await countPendingExpenses(req.organizationId!, branchId);
      res.json({ count });
    } catch (error) {
      console.error("GET /api/expenses/pending-count", error);
      res.status(500).json({ error: "Failed to fetch pending expense count" });
    }
  },
);

expensesRouter.get(
  "/reports",
  requireRole(canViewExpenses),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const reports = await getExpenseReports(req.organizationId!, branchId);
      res.json(reports);
    } catch (error) {
      console.error("GET /api/expenses/reports", error);
      res.status(500).json({ error: "Failed to fetch expense reports" });
    }
  },
);

expensesRouter.get("/", requireRole(canViewExpenses), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(
      req.user!.id,
      req.user!.role,
      req.organizationId!,
    );
    const status = req.query.status as ExpenseStatus | undefined;
    const category = req.query.category as ExpenseCategory | undefined;
    const requestedByName =
      typeof req.query.requestedByName === "string" ? req.query.requestedByName : undefined;
    const fromDate = typeof req.query.fromDate === "string" ? req.query.fromDate : undefined;
    const toDate = typeof req.query.toDate === "string" ? req.query.toDate : undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const queryBranchId =
      typeof req.query.branchId === "string" ? req.query.branchId : branchId;

    const expenses = await listExpenses(req.organizationId!, {
      branchId: queryBranchId,
      status,
      category,
      requestedByName,
      fromDate,
      toDate,
      search,
    });
    res.json(expenses);
  } catch (error) {
    console.error("GET /api/expenses", error);
    res.status(500).json({ error: "Failed to fetch expenses" });
  }
});

expensesRouter.post("/", requireRole(canViewExpenses), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getUserBranch(req.user!.id, req.organizationId!);
    const expense = await createExpenseRequest(
      req.body as NewExpenseInput,
      req.organizationId!,
      branchId,
      req.user!.name,
    );
    res.status(201).json(expense);
  } catch (error) {
    if (error instanceof ExpenseError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/expenses", error);
    res.status(500).json({ error: "Failed to create expense request" });
  }
});

expensesRouter.post(
  "/direct",
  requireRole(canManageExpenses),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const expense = await createDirectExpense(
        req.body as DirectExpenseInput,
        req.organizationId!,
        branchId,
        req.user!.name,
      );
      res.status(201).json(expense);
    } catch (error) {
      if (error instanceof ExpenseError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/expenses/direct", error);
      res.status(500).json({ error: "Failed to create direct expense" });
    }
  },
);

expensesRouter.post(
  "/:id/approve",
  requireRole(canManageExpenses),
  async (req: AuthenticatedRequest, res) => {
    try {
      const expense = await approveExpense(
        routeParam(req.params.id),
        req.organizationId!,
        req.user!.name,
      );
      res.json(expense);
    } catch (error) {
      if (error instanceof ExpenseError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/expenses/:id/approve", error);
      res.status(500).json({ error: "Failed to approve expense" });
    }
  },
);

expensesRouter.post(
  "/:id/reject",
  requireRole(canManageExpenses),
  async (req: AuthenticatedRequest, res) => {
    try {
      const expense = await rejectExpense(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as RejectExpenseInput,
        req.user!.name,
      );
      res.json(expense);
    } catch (error) {
      if (error instanceof ExpenseError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/expenses/:id/reject", error);
      res.status(500).json({ error: "Failed to reject expense" });
    }
  },
);

expensesRouter.post(
  "/:id/disburse",
  requireRole(canManageExpenses),
  async (req: AuthenticatedRequest, res) => {
    try {
      const expense = await disburseExpense(
        routeParam(req.params.id),
        req.organizationId!,
        req.user!.name,
      );
      res.json(expense);
    } catch (error) {
      if (error instanceof ExpenseError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/expenses/:id/disburse", error);
      res.status(500).json({ error: "Failed to disburse expense" });
    }
  },
);

expensesRouter.post(
  "/:id/receipt",
  requireRole(canViewExpenses),
  async (req: AuthenticatedRequest, res) => {
    try {
      const expense = await attachExpenseReceipt(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as AttachExpenseReceiptInput,
      );
      res.json(expense);
    } catch (error) {
      if (error instanceof ExpenseError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/expenses/:id/receipt", error);
      res.status(500).json({ error: "Failed to attach receipt" });
    }
  },
);

pettyCashFloatRouter.get("/", requireRole(canViewExpenses), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getUserBranch(req.user!.id, req.organizationId!);
    const floatView = await getPettyCashFloat(req.organizationId!, branchId);
    res.json(floatView);
  } catch (error) {
    console.error("GET /api/petty-cash-float", error);
    res.status(500).json({ error: "Failed to fetch petty cash float" });
  }
});

pettyCashFloatRouter.post(
  "/",
  requireRole(canManageExpenses),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const floatView = await setupPettyCashFloat(
        req.organizationId!,
        branchId,
        req.body as SetupPettyCashFloatInput,
        req.user!.name,
      );
      res.json(floatView);
    } catch (error) {
      if (error instanceof ExpenseError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/petty-cash-float", error);
      res.status(500).json({ error: "Failed to set up petty cash float" });
    }
  },
);

pettyCashFloatRouter.post(
  "/replenish",
  requireRole(canManageExpenses),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const floatView = await replenishPettyCashFloat(
        req.organizationId!,
        branchId,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(floatView);
    } catch (error) {
      if (error instanceof ExpenseError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/petty-cash-float/replenish", error);
      res.status(500).json({ error: "Failed to replenish petty cash float" });
    }
  },
);
