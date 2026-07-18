import { Router } from "express";
import { canExportTally } from "../lib/auth/permissions.js";
import {
  generateTallyExport,
  listTallyExportLogs,
  TallyExportError,
} from "../lib/tally/export-service.js";
import type { TallyExportType } from "../types.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope } from "../lib/branches/access.js";

export const tallyRouter = Router();

tallyRouter.use(authenticate);
tallyRouter.use(attachOrganization);

const parseTypes = (raw: unknown): TallyExportType[] => {
  if (typeof raw !== "string" || !raw.trim()) return [];
  return raw
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(
      (t): t is TallyExportType =>
        t === "sales" || t === "purchases" || t === "receipts" || t === "payments",
    );
};

tallyRouter.get("/export-logs", requireRole(canExportTally), async (req: AuthenticatedRequest, res) => {
  try {
    const logs = await listTallyExportLogs(req.organizationId!);
    res.json(logs);
  } catch (error) {
    console.error("GET /api/tally/export-logs", error);
    res.status(500).json({ error: "Failed to fetch export logs" });
  }
});

tallyRouter.get("/export", requireRole(canExportTally), async (req: AuthenticatedRequest, res) => {
  try {
    const from = typeof req.query.from === "string" ? req.query.from : "";
    const to = typeof req.query.to === "string" ? req.query.to : "";
    const types = parseTypes(req.query.types);
    const branchId = await getBranchScope(
      req.user!.id,
      req.user!.role,
      req.organizationId!,
    );

    const { xml, fileName } = await generateTallyExport({
      from,
      to,
      types,
      organizationId: req.organizationId!,
      exportedByName: req.user!.name,
      branchId,
    });

    res.setHeader("Content-Type", "application/xml; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.send(xml);
  } catch (error) {
    if (error instanceof TallyExportError) {
      res.status(error.statusCode).json({ error: error.message });
      return;
    }
    console.error("GET /api/tally/export", error);
    res.status(500).json({ error: "Failed to generate Tally export" });
  }
});
