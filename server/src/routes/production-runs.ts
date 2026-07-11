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
} from "../lib/production-runs/service.js";
import { generateProductionRunStagePdf } from "../lib/production-runs/stage-pdf.js";
import { completeProductionRunStage } from "../lib/production-runs/stage-service.js";
import { slugToStage } from "../lib/production-runs/stages.js";
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
