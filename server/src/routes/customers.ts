import { Router } from "express";
import { canManageCustomers } from "../lib/auth/permissions.js";
import {
  createCustomer,
  CustomerError,
  getCustomerDetail,
  listCustomers,
  lookupCustomer,
  searchCustomers,
  updateCustomer,
} from "../lib/customers/service.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { routeParam } from "../lib/route-param.js";
import type { NewCustomerInput, UpdateCustomerInput } from "../types.js";

export const customersRouter = Router();

customersRouter.use(authenticate);
customersRouter.use(attachOrganization);

customersRouter.get("/", requireRole(canManageCustomers), async (req: AuthenticatedRequest, res) => {
  try {
    const q = typeof req.query.q === "string" ? req.query.q : "";
    const customers = q
      ? await searchCustomers(req.organizationId!, q)
      : await listCustomers(req.organizationId!);
    res.json(customers);
  } catch (error) {
    console.error("GET /api/customers", error);
    res.status(500).json({ error: "Failed to fetch customers" });
  }
});

customersRouter.get(
  "/lookup",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q.trim() : "";
      if (!q) {
        res.status(400).json({ error: "Query parameter q is required." });
        return;
      }
      const result = await lookupCustomer(req.organizationId!, q);
      res.json(result);
    } catch (error) {
      console.error("GET /api/customers/lookup", error);
      res.status(500).json({ error: "Failed to lookup customer" });
    }
  },
);

customersRouter.get(
  "/:id",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const customer = await getCustomerDetail(
        routeParam(req.params.id),
        req.organizationId!,
      );
      if (!customer) {
        res.status(404).json({ error: "Customer not found" });
        return;
      }
      res.json(customer);
    } catch (error) {
      console.error("GET /api/customers/:id", error);
      res.status(500).json({ error: "Failed to fetch customer" });
    }
  },
);

customersRouter.post(
  "/",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const customer = await createCustomer(
        req.organizationId!,
        req.body as NewCustomerInput,
      );
      res.status(201).json(customer);
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/customers", error);
      res.status(500).json({ error: "Failed to create customer" });
    }
  },
);

customersRouter.patch(
  "/:id",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const customer = await updateCustomer(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as UpdateCustomerInput,
      );
      res.json(customer);
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/customers/:id", error);
      res.status(500).json({ error: "Failed to update customer" });
    }
  },
);
