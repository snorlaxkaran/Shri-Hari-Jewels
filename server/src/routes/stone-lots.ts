import { Router } from "express";
import { StonePurchaseLotStatus } from "@prisma/client";
import {
  StoneLotError,
  adjustStoneLotStock,
  getStoneLotLedger,
  getStoneLotsSummary,
  getStonePurchaseLotDetail,
  issueStonesToKarigar,
  listStonePurchaseLots,
  listUnsettledStoneIssues,
  receiveStoneLot,
  settleStoneIssue,
} from "../lib/stone-lots/service.js";
import { canReadRawInventory, canWriteRawInventory } from "../lib/auth/permissions.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";
import type {
  AdjustStonePurchaseLotInput,
  IssueStoneInput,
  NewStonePurchaseLotInput,
  SettleStoneIssueInput,
} from "../types.js";

export const stoneLotsRouter = Router();

stoneLotsRouter.use(authenticate);
stoneLotsRouter.use(attachOrganization);

stoneLotsRouter.get("/summary", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(req.user!.id, req.user!.role, req.organizationId!);
    const summary = await getStoneLotsSummary(req.organizationId!, branchId);
    res.json(summary);
  } catch (error) {
    console.error("GET /api/stone-lots/summary", error);
    res.status(500).json({ error: "Failed to fetch stone lots summary" });
  }
});

stoneLotsRouter.get("/issues/unsettled", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(req.user!.id, req.user!.role, req.organizationId!);
    const issues = await listUnsettledStoneIssues(req.organizationId!, branchId);
    res.json(issues);
  } catch (error) {
    console.error("GET /api/stone-lots/issues/unsettled", error);
    res.status(500).json({ error: "Failed to fetch unsettled stone issues" });
  }
});

stoneLotsRouter.post("/issues/:issueId/settle", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const issue = await settleStoneIssue(
      routeParam(req.params.issueId),
      req.body as SettleStoneIssueInput,
      req.organizationId!,
      req.user!.name,
    );
    res.json(issue);
  } catch (error) {
    if (error instanceof StoneLotError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-lots/issues/:issueId/settle", error);
    res.status(500).json({ error: "Failed to settle stone issue" });
  }
});

stoneLotsRouter.get("/", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const branchId = await getBranchScope(req.user!.id, req.user!.role, req.organizationId!);
    const status = req.query.status as StonePurchaseLotStatus | undefined;
    const search = typeof req.query.search === "string" ? req.query.search : undefined;

    const lots = await listStonePurchaseLots(req.organizationId!, branchId, {
      status: status && Object.values(StonePurchaseLotStatus).includes(status)
        ? status
        : undefined,
      search,
    });
    res.json(lots);
  } catch (error) {
    console.error("GET /api/stone-lots", error);
    res.status(500).json({ error: "Failed to fetch stone lots" });
  }
});

stoneLotsRouter.get("/:id", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const lot = await getStonePurchaseLotDetail(routeParam(req.params.id), req.organizationId!);
    res.json(lot);
  } catch (error) {
    if (error instanceof StoneLotError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/stone-lots/:id", error);
    res.status(500).json({ error: "Failed to fetch stone lot" });
  }
});

stoneLotsRouter.get("/:id/ledger", requireRole(canReadRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const ledger = await getStoneLotLedger(routeParam(req.params.id), req.organizationId!);
    res.json(ledger);
  } catch (error) {
    if (error instanceof StoneLotError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/stone-lots/:id/ledger", error);
    res.status(500).json({ error: "Failed to fetch stone lot ledger" });
  }
});

stoneLotsRouter.post("/", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const body = req.body as NewStonePurchaseLotInput;
    const branchId =
      body.branchId ||
      (await getUserBranch(req.user!.id, req.organizationId!));

    const lot = await receiveStoneLot(
      body,
      req.organizationId!,
      branchId,
      req.user!.name,
    );
    res.status(201).json(lot);
  } catch (error) {
    if (error instanceof StoneLotError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-lots", error);
    res.status(500).json({ error: "Failed to receive stone lot" });
  }
});

stoneLotsRouter.post("/:id/adjust", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const lot = await adjustStoneLotStock(
      routeParam(req.params.id),
      req.body as AdjustStonePurchaseLotInput,
      req.organizationId!,
      req.user!.name,
    );
    res.json(lot);
  } catch (error) {
    if (error instanceof StoneLotError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-lots/:id/adjust", error);
    res.status(500).json({ error: "Failed to adjust stone lot stock" });
  }
});

stoneLotsRouter.post("/:id/issue", requireRole(canWriteRawInventory), async (req: AuthenticatedRequest, res) => {
  try {
    const issue = await issueStonesToKarigar(
      routeParam(req.params.id),
      req.body as IssueStoneInput,
      req.organizationId!,
      req.user!.name,
    );
    res.status(201).json(issue);
  } catch (error) {
    if (error instanceof StoneLotError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("POST /api/stone-lots/:id/issue", error);
    res.status(500).json({ error: "Failed to issue stones" });
  }
});
