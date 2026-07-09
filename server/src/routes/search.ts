import { Router } from "express";
import { globalSearch } from "../lib/search/service.js";
import { getBranchScope } from "../lib/branches/access.js";
import {
  authenticate,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";

export const searchRouter = Router();

searchRouter.get(
  "/",
  authenticate,
  requireOrganization,
  async (req: AuthenticatedRequest, res) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : "";
      const branchId = await getBranchScope(
        req.user!.id,
        req.user!.role,
        req.organizationId!,
      );
      const results = await globalSearch(req.organizationId!, q, branchId);
      res.json({ results });
    } catch (error) {
      console.error("GET /api/search", error);
      res.status(500).json({ error: "Search failed." });
    }
  },
);
