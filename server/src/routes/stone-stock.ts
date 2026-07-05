import { Router } from "express";
import { StoneStockStatus } from "@prisma/client";
import {
  StoneStockError,
  adjustStoneStock,
  createStoneStock,
  getStoneStockDetail,
  getStoneStockLedger,
  getStoneStockSummary,
  issueStonesToKarigar,
  listStoneStock,
  listUnsettledStoneIssues,
  settleStoneIssue,
} from "../lib/raw-inventory/stone-stock-service.js";
import { canReadRawInventory, canWriteRawInventory } from "../lib/auth/permissions.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";
import type {
  AdjustStoneStockInput,
  IssueStoneInput,
  NewStoneStockInput,
  SettleStoneIssueInput,
} from "../types.js";

export const stoneStockRouter = Router();

stoneStockRouter.use(authenticate);
stoneStockRouter.use(attachOrganization);

stoneStockRouter.get("/summary", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(req.user!.id, req.user!.role, req.organizationId!);
    const summary = await getStoneStockSummary(req.organizationId!, branchId);
    res.json(summary);
  } catch (error) {
    console.error("GET /api/stone-stock/summary", error);
    res.status(500).json({ error: "Failed to fetch stone stock summary" });
  }
});

stoneStockRouter.get("/issues/unsettled", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(req.user!.id, req.user!.role, req.organizationId!);
    const issues = await listUnsettledStoneIssues(req.organizationId!, branchId);
    res.json(issues);
  } catch (error) {
    console.error("GET /api/stone-stock/issues/unsettled", error);
    res.status(500).json({ error: "Failed to fetch unsettled stone issues" });
  }
});

stoneStockRouter.post("/issues/:issueId/settle", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const issue = await settleStoneIssue(
      routeParam(req.params.issueId),
      req.body as SettleStoneIssueInput,
      req.organizationId!,
      req.user!.name,
    );
    res.json(issue);
  } catch (error) {
    if (error instanceof StoneStockError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-stock/issues/:issueId/settle", error);
    res.status(500).json({ error: "Failed to settle stone issue" });
  }
});

stoneStockRouter.get("/", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(req.user!.id, req.user!.role, req.organizationId!);
    const status = req.query.status as StoneStockStatus | undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;
    const rows = await listStoneStock(req.organizationId!, branchId, {
      status:
        status && Object.values(StoneStockStatus).includes(status)
          ? status
          : undefined,
      search,
    });
    res.json(rows);
  } catch (error) {
    console.error("GET /api/stone-stock", error);
    res.status(500).json({ error: "Failed to fetch stone stock" });
  }
});

stoneStockRouter.get("/:id", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const row = await getStoneStockDetail(routeParam(req.params.id), req.organizationId!);
    res.json(row);
  } catch (error) {
    if (error instanceof StoneStockError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/stone-stock/:id", error);
    res.status(500).json({ error: "Failed to fetch stone stock entry" });
  }
});

stoneStockRouter.get("/:id/ledger", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const ledger = await getStoneStockLedger(routeParam(req.params.id), req.organizationId!);
    res.json(ledger);
  } catch (error) {
    if (error instanceof StoneStockError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/stone-stock/:id/ledger", error);
    res.status(500).json({ error: "Failed to fetch stone stock ledger" });
  }
});

stoneStockRouter.post("/", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as NewStoneStockInput;
    const branchId =
      body.branchId ||
      (await getUserBranch(req.user!.id, req.organizationId!));

    const row = await createStoneStock(
      body,
      req.organizationId!,
      branchId,
      req.user!.name,
    );
    res.status(201).json(row);
  } catch (error) {
    if (error instanceof StoneStockError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-stock", error);
    res.status(500).json({ error: "Failed to log stone stock" });
  }
});

stoneStockRouter.post("/:id/adjust", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const row = await adjustStoneStock(
      routeParam(req.params.id),
      req.body as AdjustStoneStockInput,
      req.organizationId!,
      req.user!.name,
    );
    res.json(row);
  } catch (error) {
    if (error instanceof StoneStockError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-stock/:id/adjust", error);
    res.status(500).json({ error: "Failed to adjust stone stock" });
  }
});

stoneStockRouter.post("/:id/issue", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const issue = await issueStonesToKarigar(
      routeParam(req.params.id),
      req.body as IssueStoneInput,
      req.organizationId!,
      req.user!.name,
    );
    res.status(201).json(issue);
  } catch (error) {
    if (error instanceof StoneStockError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-stock/:id/issue", error);
    res.status(500).json({ error: "Failed to issue stones" });
  }
});
