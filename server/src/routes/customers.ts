import { Router } from "express";
import { canManageCustomers, canManageStockTransfers } from "../lib/auth/permissions.js";
import {
  createCustomerBranch,
  deleteCustomerBranch,
  listCustomerBranches,
  updateCustomerBranch,
} from "../lib/customers/branches.js";
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
import type {
  NewCustomerBranchInput,
  NewCustomerInput,
  UpdateCustomerBranchInput,
  UpdateCustomerInput,
} from "../types.js";

const canViewCustomerBranches = (role: Parameters<typeof canManageCustomers>[0]) =>
  canManageCustomers(role) || canManageStockTransfers(role);

export const customersRouter = Router();

customersRouter.use(authenticate);
customersRouter.use(attachOrganization);

customersRouter.get("/", requireRole(canViewCustomerBranches), async (req: AuthenticatedRequest, res) => {
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
  "/:customerId/branches",
  requireRole(canViewCustomerBranches),
  async (req: AuthenticatedRequest, res) => {
    try {
      const q = typeof req.query.q === "string" ? req.query.q : undefined;
      const branches = await listCustomerBranches(
        routeParam(req.params.customerId),
        req.organizationId!,
        q,
      );
      res.json(branches);
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/customers/:customerId/branches", error);
      res.status(500).json({ error: "Failed to fetch customer branches" });
    }
  },
);

customersRouter.post(
  "/:customerId/branches",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branch = await createCustomerBranch(
        routeParam(req.params.customerId),
        req.organizationId!,
        req.body as NewCustomerBranchInput,
      );
      res.status(201).json(branch);
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/customers/:customerId/branches", error);
      res.status(500).json({ error: "Failed to create customer branch" });
    }
  },
);

customersRouter.patch(
  "/:customerId/branches/:branchId",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branch = await updateCustomerBranch(
        routeParam(req.params.customerId),
        routeParam(req.params.branchId),
        req.organizationId!,
        req.body as UpdateCustomerBranchInput,
      );
      res.json(branch);
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/customers/:customerId/branches/:branchId", error);
      res.status(500).json({ error: "Failed to update customer branch" });
    }
  },
);

customersRouter.delete(
  "/:customerId/branches/:branchId",
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      await deleteCustomerBranch(
        routeParam(req.params.customerId),
        routeParam(req.params.branchId),
        req.organizationId!,
      );
      res.status(204).send();
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/customers/:customerId/branches/:branchId", error);
      res.status(500).json({ error: "Failed to delete customer branch" });
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
