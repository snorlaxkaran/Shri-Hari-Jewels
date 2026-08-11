import { Router } from "express";
import {
  canManageSettings,
  canReadInventory,
  canWriteInventory,
} from "../lib/auth/permissions.js";
import {
  canCreateDropdownOptionInline,
  createDropdownOption,
  DropdownOptionError,
  listDropdownOptions,
  reorderDropdownOptions,
  updateDropdownOption,
} from "../lib/dropdown-options/service.js";
import { authenticate, requireRole, type AuthenticatedRequest } from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { routeParam } from "../lib/route-param.js";
import type {
  NewDropdownOptionInput,
  ReorderDropdownOptionsInput,
  UpdateDropdownOptionInput,
} from "../types.js";

export const dropdownOptionsRouter = Router();

dropdownOptionsRouter.use(authenticate);
dropdownOptionsRouter.use(attachOrganization);

dropdownOptionsRouter.get(
  "/",
  requireRole(canReadInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const fieldKey =
        typeof req.query.fieldKey === "string" ? req.query.fieldKey : undefined;
      const activeOnly = req.query.activeOnly !== "false";
      const options = await listDropdownOptions(req.organizationId!, {
        fieldKey,
        activeOnly,
      });
      res.json(options);
    } catch (error) {
      console.error("GET /api/dropdown-options", error);
      res.status(500).json({ error: "Failed to fetch dropdown options" });
    }
  },
);

dropdownOptionsRouter.post(
  "/",
  requireRole(canWriteInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as NewDropdownOptionInput;
      const fieldKey = input.fieldKey?.trim() ?? "";
      const inlineAllowed = canCreateDropdownOptionInline(fieldKey);
      const isAdmin = canManageSettings(req.user!.role);

      if (!inlineAllowed && !isAdmin) {
        res.status(403).json({
          error: "Only admins can add options for this field. Use Settings → Dropdown options.",
        });
        return;
      }

      const option = await createDropdownOption(req.organizationId!, input);
      res.status(201).json(option);
    } catch (error) {
      if (error instanceof DropdownOptionError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/dropdown-options", error);
      res.status(500).json({ error: "Failed to create dropdown option" });
    }
  },
);

dropdownOptionsRouter.patch(
  "/reorder",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const options = await reorderDropdownOptions(
        req.organizationId!,
        req.body as ReorderDropdownOptionsInput,
      );
      res.json(options);
    } catch (error) {
      if (error instanceof DropdownOptionError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/dropdown-options/reorder", error);
      res.status(500).json({ error: "Failed to reorder dropdown options" });
    }
  },
);

dropdownOptionsRouter.patch(
  "/:id",
  requireRole(canManageSettings),
  async (req: AuthenticatedRequest, res) => {
    try {
      const option = await updateDropdownOption(
        req.organizationId!,
        routeParam(req.params.id),
        req.body as UpdateDropdownOptionInput,
      );
      res.json(option);
    } catch (error) {
      if (error instanceof DropdownOptionError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/dropdown-options/:id", error);
      res.status(500).json({ error: "Failed to update dropdown option" });
    }
  },
);
