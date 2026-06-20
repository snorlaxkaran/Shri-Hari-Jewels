import { Router } from "express";
import {
  canManageDesigns,
  canViewDesigns,
} from "../lib/auth/permissions.js";
import {
  addDesignElement,
  computeDesignElementDiff,
  createDesign,
  deleteDesign,
  deleteDesignElement,
  DesignError,
  listDesigns,
  replaceDesignElements,
  updateDesign,
  updateDesignElement,
} from "../lib/designs/service.js";
import {
  buildImportPreview,
  confirmedRowsToElements,
  parseDesignImportRows,
} from "../lib/designs/import.js";
import { listMotifs } from "../lib/motifs/service.js";
import { getDesignPriceDrift } from "../lib/catalog/price-drift.js";
import { listCatalogAuditLogs } from "../lib/catalog/audit.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { prisma } from "../lib/db.js";
import { DEFAULT_BRANCH_ID } from "../lib/branches/constants.js";
import { routeParam } from "../lib/route-param.js";
import type {
  ConfirmedDesignImportRow,
  NewDesignElementInput,
  NewDesignInput,
  UpdateDesignElementInput,
  UpdateDesignInput,
} from "../types.js";

export const designsRouter = Router();

designsRouter.use(authenticate);

const getUserBranch = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: { take: 1 } },
  });

  if (user?.defaultBranchId) return user.defaultBranchId;
  if (user?.branches.length) return user.branches[0].branchId;
  return DEFAULT_BRANCH_ID;
};

const actorFrom = (req: AuthenticatedRequest) => ({
  id: req.user!.id,
  name: req.user!.name,
});

designsRouter.get("/", requireRole(canViewDesigns), async (_req, res) => {
  try {
    const designs = await listDesigns();
    res.json(designs);
  } catch (error) {
    console.error("GET /api/designs", error);
    res.status(500).json({ error: "Failed to fetch designs" });
  }
});

designsRouter.post(
  "/",
  requireRole(canManageDesigns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id);
      const design = await createDesign(
        req.body as NewDesignInput,
        branchId,
        actorFrom(req),
      );
      res.status(201).json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/designs", error);
      res.status(500).json({ error: "Failed to create design" });
    }
  },
);

designsRouter.patch(
  "/:id",
  requireRole(canManageDesigns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const design = await updateDesign(
        routeParam(req.params.id),
        req.body as UpdateDesignInput,
        actorFrom(req),
      );
      res.json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/designs/:id", error);
      res.status(500).json({ error: "Failed to update design" });
    }
  },
);

designsRouter.delete(
  "/:id",
  requireRole(canManageDesigns),
  async (req: AuthenticatedRequest, res) => {
    try {
      await deleteDesign(routeParam(req.params.id), actorFrom(req));
      res.status(204).send();
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/designs/:id", error);
      res.status(500).json({ error: "Failed to delete design" });
    }
  },
);

designsRouter.get(
  "/:id/price-drift",
  requireRole(canViewDesigns),
  async (req, res) => {
    try {
      const drifts = await getDesignPriceDrift(routeParam(req.params.id));
      res.json(drifts);
    } catch (error) {
      console.error("GET /api/designs/:id/price-drift", error);
      res.status(500).json({ error: "Failed to check price drift" });
    }
  },
);

designsRouter.get(
  "/:id/audit-log",
  requireRole(canViewDesigns),
  async (req, res) => {
    try {
      const limit = req.query.limit
        ? parseInt(String(req.query.limit), 10)
        : 10;
      const logs = await listCatalogAuditLogs(
        "Design",
        routeParam(req.params.id),
        limit,
      );
      res.json(logs);
    } catch (error) {
      console.error("GET /api/designs/:id/audit-log", error);
      res.status(500).json({ error: "Failed to fetch design audit log" });
    }
  },
);

designsRouter.post(
  "/:id/elements/diff",
  requireRole(canManageDesigns),
  async (req, res) => {
    try {
      const designId = routeParam(req.params.id);
      const design = await prisma.design.findUnique({
        where: { id: designId },
        include: { elements: { orderBy: { sortOrder: "asc" } } },
      });
      if (!design) {
        res.status(404).json({ error: "Design not found." });
        return;
      }

      const target = req.body.elements as NewDesignElementInput[];
      if (!Array.isArray(target)) {
        res.status(400).json({ error: "Provide elements array." });
        return;
      }

      const diff = computeDesignElementDiff(
        design.elements.map((e) => ({
          id: e.id,
          designId: e.designId,
          motifId: e.motifId ?? undefined,
          name: e.name,
          type: e.type as NewDesignElementInput["type"],
          qtyPerSet: e.qtyPerSet,
          unitValue: e.unitValue ? Number(e.unitValue) : undefined,
          weightGramsPerPc: e.weightGramsPerPc ?? undefined,
          sortOrder: e.sortOrder,
        })),
        target,
      );
      res.json(diff);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/designs/:id/elements/diff", error);
      res.status(500).json({ error: "Failed to compute BOM diff" });
    }
  },
);

designsRouter.post(
  "/:id/elements/replace",
  requireRole(canManageDesigns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const design = await replaceDesignElements(
        routeParam(req.params.id),
        req.body.elements as NewDesignElementInput[],
        actorFrom(req),
        req.body.reason as string | undefined,
      );
      res.json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/designs/:id/elements/replace", error);
      res.status(500).json({ error: "Failed to replace design elements" });
    }
  },
);

designsRouter.post(
  "/:id/import/preview",
  requireRole(canManageDesigns),
  async (req, res) => {
    try {
      const designId = routeParam(req.params.id);
      const { rows, sheetName } = req.body as {
        rows: unknown[][];
        sheetName: string;
      };

      if (!Array.isArray(rows) || !sheetName?.trim()) {
        res.status(400).json({ error: "Provide rows and sheetName." });
        return;
      }

      const design = await prisma.design.findUnique({
        where: { id: designId },
        include: { elements: { orderBy: { sortOrder: "asc" } } },
      });
      if (!design) {
        res.status(404).json({ error: "Design not found." });
        return;
      }

      const { designCode, parsedRows, warnings } = parseDesignImportRows(
        rows,
        sheetName,
      );
      const motifs = await listMotifs();

      const preview = buildImportPreview(
        designCode,
        sheetName,
        parsedRows,
        motifs,
        design.elements.map((e) => ({
          id: e.id,
          designId: e.designId,
          motifId: e.motifId ?? undefined,
          name: e.name,
          type: e.type as NewDesignElementInput["type"],
          qtyPerSet: e.qtyPerSet,
          unitValue: e.unitValue ? Number(e.unitValue) : undefined,
          weightGramsPerPc: e.weightGramsPerPc ?? undefined,
          sortOrder: e.sortOrder,
        })),
        warnings,
      );

      if (designCode !== design.code) {
        preview.warnings.push(
          `Import SKU "${designCode}" does not match selected design "${design.code}". Sheet name / embedded code wins for import mapping only.`,
        );
      }

      res.json(preview);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/designs/:id/import/preview", error);
      res.status(500).json({ error: "Failed to preview import" });
    }
  },
);

designsRouter.post(
  "/:id/import/apply",
  requireRole(canManageDesigns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const confirmed = req.body.rows as ConfirmedDesignImportRow[];
      if (!Array.isArray(confirmed) || confirmed.length === 0) {
        res.status(400).json({ error: "Provide confirmed import rows." });
        return;
      }

      const elements = confirmedRowsToElements(confirmed).map((row) => ({
        name: row.name,
        type: row.type,
        qtyPerSet: row.qtyPerSet,
        motifId: row.motifId,
      }));

      const design = await replaceDesignElements(
        routeParam(req.params.id),
        elements,
        actorFrom(req),
        req.body.reason ?? "Excel BOM import",
      );
      res.json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/designs/:id/import/apply", error);
      res.status(500).json({ error: "Failed to apply import" });
    }
  },
);

designsRouter.post(
  "/:id/elements",
  requireRole(canManageDesigns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const design = await addDesignElement(
        routeParam(req.params.id),
        req.body as NewDesignElementInput,
        actorFrom(req),
      );
      res.status(201).json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/designs/:id/elements", error);
      res.status(500).json({ error: "Failed to add design element" });
    }
  },
);

designsRouter.patch(
  "/:id/elements/:elementId",
  requireRole(canManageDesigns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const design = await updateDesignElement(
        routeParam(req.params.id),
        routeParam(req.params.elementId),
        req.body as UpdateDesignElementInput,
        actorFrom(req),
      );
      res.json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/designs/:id/elements/:elementId", error);
      res.status(500).json({ error: "Failed to update design element" });
    }
  },
);

designsRouter.delete(
  "/:id/elements/:elementId",
  requireRole(canManageDesigns),
  async (req: AuthenticatedRequest, res) => {
    try {
      const design = await deleteDesignElement(
        routeParam(req.params.id),
        routeParam(req.params.elementId),
        actorFrom(req),
      );
      res.json(design);
    } catch (error) {
      if (error instanceof DesignError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/designs/:id/elements/:elementId", error);
      res.status(500).json({ error: "Failed to delete design element" });
    }
  },
);
