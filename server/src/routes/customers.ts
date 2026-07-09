import { Router } from "express";
import {
  canEditCustomerInfo,
  canManageCustomers,
  canManageDeptContacts,
  canDeleteDeptContacts,
  canManageStockTransfers,
} from "../lib/auth/permissions.js";
import {
  createCustomerBranch,
  deleteCustomerBranch,
  listCustomerBranches,
  updateCustomerBranch,
} from "../lib/customers/branches.js";
import {
  addDeptContact,
  createCustomer,
  CustomerError,
  deleteDeptContact,
  bulkImportCustomers,
  getCustomerDetail,
  getDeptContact,
  listCustomers,
  listDeptContacts,
  lookupCustomer,
  searchCustomers,
  updateCustomer,
  updateDeptContact,
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
  NewCustomerDeptContactInput,
  NewCustomerInput,
  UpdateCustomerBranchInput,
  UpdateCustomerDeptContactInput,
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
  requireRole(canEditCustomerInfo),
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
  requireRole(canEditCustomerInfo),
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
  requireRole(canEditCustomerInfo),
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
  requireRole(canEditCustomerInfo),
  async (req: AuthenticatedRequest, res) => {
    try {
      const customer = await createCustomer(
        req.organizationId!,
        req.body as NewCustomerInput,
        { id: req.user!.id, name: req.user!.name },
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

customersRouter.post(
  "/import",
  requireRole(canEditCustomerInfo),
  async (req: AuthenticatedRequest, res) => {
    try {
      const rows = Array.isArray(req.body?.rows) ? req.body.rows : [];
      const result = await bulkImportCustomers(
        req.organizationId!,
        rows,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(result);
    } catch (error) {
      console.error("POST /api/customers/import", error);
      res.status(500).json({ error: "Failed to import customers." });
    }
  },
);

customersRouter.patch(
  "/:id",
  requireRole(canEditCustomerInfo),
  async (req: AuthenticatedRequest, res) => {
    try {
      const customer = await updateCustomer(
        routeParam(req.params.id),
        req.organizationId!,
        req.body as UpdateCustomerInput,
        { id: req.user!.id, name: req.user!.name },
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

customersRouter.get(
  "/:id/dept-contacts",
  requireRole(canViewCustomerBranches),
  async (req: AuthenticatedRequest, res) => {
    try {
      const contacts = await listDeptContacts(
        routeParam(req.params.id),
        req.organizationId!,
      );
      res.json(contacts);
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/customers/:id/dept-contacts", error);
      res.status(500).json({ error: "Failed to fetch department contacts" });
    }
  },
);

customersRouter.post(
  "/:id/dept-contacts",
  requireRole(canManageDeptContacts),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as NewCustomerDeptContactInput;
      if (!body.department?.trim() || !body.personName?.trim()) {
        res.status(400).json({ error: "Department and person name are required." });
        return;
      }
      const contact = await addDeptContact(
        routeParam(req.params.id),
        req.organizationId!,
        body,
        req.user!.id,
      );
      res.status(201).json(contact);
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/customers/:id/dept-contacts", error);
      res.status(500).json({ error: "Failed to add department contact" });
    }
  },
);

customersRouter.patch(
  "/:id/dept-contacts/:contactId",
  requireRole(canManageDeptContacts),
  async (req: AuthenticatedRequest, res) => {
    try {
      const contactId = routeParam(req.params.contactId);
      const contact = await getDeptContact(contactId, req.organizationId!);
      const isAdmin = req.user!.role === "Admin";
      const isCreator = contact.createdByUserId === req.user!.id;
      if (!isAdmin && !isCreator) {
        res.status(403).json({ error: "You can only edit contacts you created." });
        return;
      }
      const updated = await updateDeptContact(
        contactId,
        req.organizationId!,
        req.body as UpdateCustomerDeptContactInput,
      );
      res.json(updated);
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/customers/:id/dept-contacts/:contactId", error);
      res.status(500).json({ error: "Failed to update department contact" });
    }
  },
);

customersRouter.delete(
  "/:id/dept-contacts/:contactId",
  requireRole(canDeleteDeptContacts),
  async (req: AuthenticatedRequest, res) => {
    try {
      await deleteDeptContact(
        routeParam(req.params.contactId),
        req.organizationId!,
      );
      res.json({ success: true });
    } catch (error) {
      if (error instanceof CustomerError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/customers/:id/dept-contacts/:contactId", error);
      res.status(500).json({ error: "Failed to delete department contact" });
    }
  },
);
