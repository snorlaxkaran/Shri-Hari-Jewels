import { Router } from "express";
import {
  canManageProductionRuns,
  canUpdateProductionRunItems,
  canViewProductionRuns,
} from "../lib/auth/permissions.js";
import {
  createProductionRun,
  deleteProductionRun,
  exportProductionRunCsv,
  getFinishedGoodsDefaults,
  getProductionRun,
  listProductionRuns,
  previewProductionRun,
  ProductionRunError,
  updateProductionRun,
  updateProductionRunItem,
  reserveProductionRunMetal,
} from "../lib/production-runs/service.js";
import { generateProductionRunStagePdf } from "../lib/production-runs/stage-pdf.js";
import { completeProductionRunStage, rejectProductionRunStage } from "../lib/production-runs/stage-service.js";
import {
  issueMetalToKarigar,
  listMetalIssuesForRun,
  MetalIssueError,
  recordMetalReturn,
} from "../lib/production-runs/metal-issue-service.js";
import {
  listNcrsForRun,
  listQcRecordsForRun,
  QcError,
  submitProductionRunItemQc,
} from "../lib/production-runs/qc-service.js";
import { slugToStage, PRODUCTION_RUN_STAGES, type ProductionRunStage } from "../lib/production-runs/stages.js";
import { getShopSettings } from "../lib/settings/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import { OrganizationAccessError } from "../lib/organizations/access.js";
import { routeParam } from "../lib/route-param.js";
import type {
  NewProductionRunInput,
  UpdateProductionRunInput,
  UpdateProductionRunItemInput,
  CompleteProductionRunStageInput,
  RejectProductionRunStageInput,
} from "../types.js";

export const productionRunsRouter = Router();

productionRunsRouter.use(authenticate);
productionRunsRouter.use(attachOrganization);

productionRunsRouter.get(
  "/",
  requireRole(canViewProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getBranchScope(req.user!.id, req.user!.role, req.organizationId!);
      const runs = await listProductionRuns(req.organizationId!, branchId);
      res.json(runs);
    } catch (error) {
      console.error("GET /api/production-runs", error);
      res.status(500).json({ error: "Failed to fetch production runs" });
    }
  },
);

productionRunsRouter.get(
  "/preview",
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const designId = String(req.query.designId ?? "");
      const setsOrdered = parseInt(String(req.query.setsOrdered ?? "0"), 10);
      if (!designId) {
        res.status(400).json({ error: "designId is required." });
        return;
      }
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const preview = await previewProductionRun(
        designId,
        setsOrdered,
        branchId,
        req.organizationId!,
      );
      res.json(preview);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/preview", error);
      res.status(500).json({ error: "Failed to preview production run" });
    }
  },
);

productionRunsRouter.get(
  "/:id/finished-goods-defaults",
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const defaults = await getFinishedGoodsDefaults(
        routeParam(req.params.id),
        req.organizationId!,
      );
      res.json(defaults);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id/finished-goods-defaults", error);
      res.status(500).json({ error: "Failed to load finished goods defaults" });
    }
  },
);

productionRunsRouter.get(
  "/:id",
  requireRole(canViewProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const run = await getProductionRun(
        routeParam(req.params.id),
        req.organizationId!,
      );
      res.json(run);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id", error);
      res.status(500).json({ error: "Failed to fetch production run" });
    }
  },
);

productionRunsRouter.post(
  "/:id/reserve-metal",
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const run = await reserveProductionRunMetal(
        routeParam(req.params.id),
        req.organizationId!,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(run);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/production-runs/:id/reserve-metal", error);
      res.status(500).json({ error: "Failed to reserve metal for production run" });
    }
  },
);

productionRunsRouter.get(
  "/:id/export",
  requireRole(canViewProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const id = routeParam(req.params.id);
      const organizationId = req.organizationId!;
      const run = await getProductionRun(id, organizationId);
      const csv = await exportProductionRunCsv(id, organizationId);
      res.setHeader("Content-Type", "text/csv");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${run.runNo}.csv"`,
      );
      res.send(csv);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id/export", error);
      res.status(500).json({ error: "Failed to export production run" });
    }
  },
);

productionRunsRouter.post(
  "/",
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const run = await createProductionRun(
        req.body as NewProductionRunInput,
        branchId,
        req.organizationId!,
        { id: req.user!.id, name: req.user!.name },
      );
      res.status(201).json(run);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/production-runs", error);
      res.status(500).json({ error: "Failed to create production run" });
    }
  },
);

productionRunsRouter.patch(
  "/:id",
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const run = await updateProductionRun(
        routeParam(req.params.id),
        req.body as UpdateProductionRunInput,
        { id: req.user!.id, name: req.user!.name },
        req.organizationId!,
      );
      res.json(run);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/production-runs/:id", error);
      res.status(500).json({ error: "Failed to update production run" });
    }
  },
);

productionRunsRouter.patch(
  "/:id/items/:itemId",
  requireRole(canUpdateProductionRunItems),
  async (req: AuthenticatedRequest, res) => {
    try {
      const run = await updateProductionRunItem(
        routeParam(req.params.id),
        routeParam(req.params.itemId),
        req.body as UpdateProductionRunItemInput,
        { id: req.user!.id, name: req.user!.name },
        req.organizationId!,
      );
      res.json(run);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/production-runs/:id/items/:itemId", error);
      res.status(500).json({ error: "Failed to update production run item" });
    }
  },
);

productionRunsRouter.get(
  "/:id/stages/:stageSlug/pdf",
  requireRole(canViewProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stage = slugToStage(routeParam(req.params.stageSlug));
      if (!stage) {
        res.status(400).json({ error: "Invalid stage." });
        return;
      }
      const id = routeParam(req.params.id);
      const run = await getProductionRun(id, req.organizationId!);
      const settings = await getShopSettings(req.organizationId!);
      const pdf = await generateProductionRunStagePdf({ run, stage, settings });
      const slug = routeParam(req.params.stageSlug);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${run.runNo}-${slug}.pdf"`,
      );
      res.send(pdf);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id/stages/:stageSlug/pdf", error);
      res.status(500).json({ error: "Failed to generate stage PDF" });
    }
  },
);

productionRunsRouter.post(
  "/:id/stages/:stageSlug/complete",
  requireRole(canUpdateProductionRunItems),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stage = slugToStage(routeParam(req.params.stageSlug));
      if (!stage) {
        res.status(400).json({ error: "Invalid stage." });
        return;
      }
      const result = await completeProductionRunStage(
        routeParam(req.params.id),
        stage,
        req.body as CompleteProductionRunStageInput,
        { id: req.user!.id, name: req.user!.name },
        req.organizationId!,
      );
      res.json(result);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/production-runs/:id/stages/:stageSlug/complete", error);
      res.status(500).json({ error: "Failed to complete stage" });
    }
  },
);

productionRunsRouter.post(
  "/:id/stages/:stageSlug/reject",
  requireRole(canUpdateProductionRunItems),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stage = slugToStage(routeParam(req.params.stageSlug));
      if (!stage) {
        res.status(400).json({ error: "Invalid stage." });
        return;
      }
      const result = await rejectProductionRunStage(
        routeParam(req.params.id),
        stage,
        req.body as RejectProductionRunStageInput,
        { id: req.user!.id, name: req.user!.name },
        req.organizationId!,
      );
      res.json(result);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/production-runs/:id/stages/:stageSlug/reject", error);
      res.status(500).json({ error: "Failed to reject stage." });
    }
  },
);

productionRunsRouter.get(
  "/:id/qc-records",
  requireRole(canViewProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const records = await listQcRecordsForRun(
        routeParam(req.params.id),
        req.organizationId!,
      );
      res.json(records);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof QcError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id/qc-records", error);
      res.status(500).json({ error: "Failed to list QC records." });
    }
  },
);

productionRunsRouter.get(
  "/:id/ncrs",
  requireRole(canViewProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const ncrs = await listNcrsForRun(
        routeParam(req.params.id),
        req.organizationId!,
      );
      res.json(ncrs);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof QcError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id/ncrs", error);
      res.status(500).json({ error: "Failed to list NCRs." });
    }
  },
);

productionRunsRouter.post(
  "/:id/items/:itemId/qc",
  requireRole(canUpdateProductionRunItems),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as {
        checklistResults?: Record<string, boolean>;
        inspectedByName?: string;
        photoUrls?: string[];
        severity?: "Minor" | "Major" | "Critical";
        description?: string;
        failedCriteria?: string[];
        sentToStage?: string;
      };
      const parseSentToStage = (value?: string): ProductionRunStage | undefined => {
        if (!value) return undefined;
        const fromSlug = slugToStage(value);
        if (fromSlug) return fromSlug;
        if (PRODUCTION_RUN_STAGES.includes(value as ProductionRunStage)) {
          return value as ProductionRunStage;
        }
        return undefined;
      };

      const result = await submitProductionRunItemQc(
        routeParam(req.params.id),
        routeParam(req.params.itemId),
        {
          checklistResults: body.checklistResults ?? {},
          inspectedByName: String(body.inspectedByName ?? ""),
          photoUrls: body.photoUrls,
          severity: body.severity,
          description: body.description,
          failedCriteria: body.failedCriteria,
          sentToStage: parseSentToStage(body.sentToStage),
        },
        { id: req.user!.id, name: req.user!.name },
        req.organizationId!,
      );
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof QcError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/production-runs/:id/items/:itemId/qc", error);
      res.status(500).json({ error: "Failed to submit QC." });
    }
  },
);

productionRunsRouter.get(
  "/:id/metal-issues",
  requireRole(canViewProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const issues = await listMetalIssuesForRun(
        routeParam(req.params.id),
        req.organizationId!,
      );
      res.json(issues);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof MetalIssueError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/production-runs/:id/metal-issues", error);
      res.status(500).json({ error: "Failed to list metal issues." });
    }
  },
);

productionRunsRouter.post(
  "/:id/stages/:stageSlug/metal-issue",
  requireRole(canUpdateProductionRunItems),
  async (req: AuthenticatedRequest, res) => {
    try {
      const stage = slugToStage(routeParam(req.params.stageSlug));
      if (!stage) {
        res.status(400).json({ error: "Invalid stage." });
        return;
      }
      const body = req.body as {
        karigarName?: string;
        weightIssuedGrams?: number;
        metalLotId?: string;
        purity?: string;
      };
      const issue = await issueMetalToKarigar(
        routeParam(req.params.id),
        stage,
        {
          karigarName: String(body.karigarName ?? ""),
          weightIssuedGrams: Number(body.weightIssuedGrams ?? 0),
          metalLotId: body.metalLotId,
          purity: String(body.purity ?? ""),
        },
        req.organizationId!,
        { id: req.user!.id, name: req.user!.name },
      );
      res.status(201).json(issue);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof MetalIssueError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/production-runs/:id/stages/:stageSlug/metal-issue", error);
      res.status(500).json({ error: "Failed to issue metal." });
    }
  },
);

productionRunsRouter.post(
  "/:id/metal-issues/:issueId/return",
  requireRole(canUpdateProductionRunItems),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as {
        weightReturnedGrams?: number;
        lossReason?: string;
      };
      const issue = await recordMetalReturn(
        routeParam(req.params.issueId),
        {
          weightReturnedGrams: Number(body.weightReturnedGrams ?? 0),
          lossReason: body.lossReason,
        },
        req.organizationId!,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(issue);
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof MetalIssueError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/production-runs/:id/metal-issues/:issueId/return", error);
      res.status(500).json({ error: "Failed to record metal return." });
    }
  },
);

productionRunsRouter.delete(
  "/:id",
  requireRole(canManageProductionRuns),
  async (req: AuthenticatedRequest, res) => {
    try {
      await deleteProductionRun(
        routeParam(req.params.id),
        req.organizationId!,
        { id: req.user!.id, name: req.user!.name },
      );
      res.status(204).send();
    } catch (error) {
      if (error instanceof OrganizationAccessError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      if (error instanceof ProductionRunError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/production-runs/:id", error);
      res.status(500).json({ error: "Failed to delete production run" });
    }
  },
);
