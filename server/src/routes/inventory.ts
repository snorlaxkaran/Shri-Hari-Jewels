import { Router } from "express";
import {
  canDeleteProduct,
  canManageStockTransfers,
  canReadInventory,
  canViewStockTransfers,
  canWriteInventory,
} from "../lib/auth/permissions.js";
import {
  addQuantityToProduct,
  createStockTransfer,
  createProduct,
  deleteInventoryUnit,
  deleteProduct,
  InventoryError,
  listStockTransfers,
  listProducts,
  repairInventory,
  transferInventoryUnits,
  updateProduct,
} from "../lib/inventory/service.js";
import { getItemCodeHistory } from "../lib/inventory/item-history-service.js";
import { importLegacyStock } from "../lib/inventory/stock-import.js";
import {
  acceptStockTransfer,
  cancelStockTransfer,
  countPendingIncomingTransfers,
  getStockTransferById,
  listAllTransfersForProforma,
  listIncomingStockTransfers,
  listSentStockTransfers,
  partialAcceptStockTransfer,
  regenerateTransferInvoicePdf,
  rejectStockTransfer,
  saveTransferShipping,
  saveTransferShippingAndGenerateInvoice,
} from "../lib/inventory/transfer-actions.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { getBranchScope, getUserBranch } from "../lib/branches/access.js";
import { routeParam } from "../lib/route-param.js";
import type {
  CreateStockTransferInput,
  LegacyStockImportRow,
  NewProductInput,
  PartialAcceptTransferInput,
  UpdateProductInput,
} from "../types.js";
import { StockTransferStatus } from "@prisma/client";
import { getShopSettings } from "../lib/settings/service.js";

export const inventoryRouter = Router();

inventoryRouter.use(authenticate);
inventoryRouter.use(attachOrganization);

inventoryRouter.post(
  "/repair",
  requireRole((role) => role === "Admin"),
  async (req: AuthenticatedRequest, res) => {
    try {
      const report = await repairInventory({
        id: req.user!.id,
        name: req.user!.name,
      });
      res.json(report);
    } catch (error) {
      console.error("POST /api/inventory/repair", error);
      res.status(500).json({ error: "Failed to repair inventory" });
    }
  },
);

inventoryRouter.get("/", requireRole(canReadInventory), async (req: AuthenticatedRequest, res) => {
  try {
    res.set("Cache-Control", "no-store");
    const branchId = await getBranchScope(req.user!.id, req.user!.role, req.organizationId!);

    const sortByRaw = typeof req.query.sortBy === "string" ? req.query.sortBy : undefined;
    const sortOrderRaw =
      typeof req.query.sortOrder === "string" ? req.query.sortOrder : undefined;

    const allowedSortFields = new Set([
      "createdAt",
      "weightGrams",
      "price",
      "category",
    ]);
    const sortBy = allowedSortFields.has(sortByRaw ?? "")
      ? (sortByRaw as "createdAt" | "weightGrams" | "price" | "category")
      : undefined;
    const sortOrder =
      sortOrderRaw === "asc" || sortOrderRaw === "desc" ? sortOrderRaw : undefined;

    const items = await listProducts(req.organizationId!, branchId, {
      sortBy,
      sortOrder,
    });
    res.json(items);
  } catch (error) {
    console.error("GET /api/inventory", error);
    res.status(500).json({ error: "Failed to fetch inventory" });
  }
});

inventoryRouter.get(
  "/item/:itemCode/history",
  requireRole(canReadInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const history = await getItemCodeHistory(
        routeParam(req.params.itemCode),
        req.organizationId!,
      );
      res.json(history);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/inventory/item/:itemCode/history", error);
      res.status(500).json({ error: "Failed to fetch item history" });
    }
  },
);

inventoryRouter.post(
  "/",
  requireRole(canWriteInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const input = req.body as NewProductInput;

      if (!input.name?.trim()) {
        res.status(400).json({ error: "Product name is required" });
        return;
      }
      if (!input.quantity || input.quantity < 1) {
        res.status(400).json({ error: "Quantity must be at least 1" });
        return;
      }

      const branchId = await getUserBranch(req.user!.id, req.organizationId!);

      const product = await createProduct(
        {
          ...input,
          images: input.images ?? [],
        },
        branchId,
        { id: req.user!.id, name: req.user!.name },
      );
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/inventory", error);
      res.status(500).json({ error: "Failed to create product" });
    }
  },
);

inventoryRouter.post(
  "/import",
  requireRole(canWriteInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const rows = Array.isArray(req.body?.rows)
        ? (req.body.rows as LegacyStockImportRow[])
        : [];

      if (!rows.length) {
        res.status(400).json({ error: "No rows to import." });
        return;
      }

      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const result = await importLegacyStock(rows, branchId, {
        id: req.user!.id,
        name: req.user!.name,
      });
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/inventory/import", error);
      res.status(500).json({ error: "Failed to import stock" });
    }
  },
);

inventoryRouter.get(
  "/transfers/incoming/count",
  requireRole(canViewStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const count = await countPendingIncomingTransfers(branchId);
      res.json({ count });
    } catch (error) {
      console.error("GET /api/inventory/transfers/incoming/count", error);
      res.status(500).json({ error: "Failed to count incoming transfers" });
    }
  },
);

inventoryRouter.get(
  "/transfers/incoming",
  requireRole(canViewStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const statusParam = req.query.status;
      const status =
        typeof statusParam === "string" &&
        Object.values(StockTransferStatus).includes(
          statusParam as StockTransferStatus,
        )
          ? (statusParam as StockTransferStatus)
          : undefined;
      const transfers = await listIncomingStockTransfers(
        req.organizationId!,
        branchId,
        status,
      );
      res.json(transfers);
    } catch (error) {
      console.error("GET /api/inventory/transfers/incoming", error);
      res.status(500).json({ error: "Failed to fetch incoming transfers" });
    }
  },
);

inventoryRouter.get(
  "/transfers/sent",
  requireRole(canViewStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const fromBranchId =
        req.user!.role === "Admin"
          ? undefined
          : await getUserBranch(req.user!.id, req.organizationId!);
      const transfers = await listSentStockTransfers(
        req.organizationId!,
        fromBranchId,
      );
      res.json(transfers);
    } catch (error) {
      console.error("GET /api/inventory/transfers/sent", error);
      res.status(500).json({ error: "Failed to fetch sent transfers" });
    }
  },
);

inventoryRouter.get(
  "/transfers/proforma",
  requireRole(canViewStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const fromBranchId =
        req.user!.role === "Admin"
          ? undefined
          : await getUserBranch(req.user!.id, req.organizationId!);
      const transfers = await listAllTransfersForProforma(
        req.organizationId!,
        fromBranchId,
      );
      res.json(transfers);
    } catch (error) {
      console.error("GET /api/inventory/transfers/proforma", error);
      res.status(500).json({ error: "Failed to fetch proforma transfers" });
    }
  },
);

inventoryRouter.get(
  "/transfers/:id",
  requireRole(canViewStockTransfers),
  async (req, res) => {
    try {
      const transfer = await getStockTransferById(routeParam(req.params.id));
      if (!transfer) {
        res.status(404).json({ error: "Transfer not found" });
        return;
      }
      res.json(transfer);
    } catch (error) {
      console.error("GET /api/inventory/transfers/:id", error);
      res.status(500).json({ error: "Failed to fetch transfer" });
    }
  },
);

inventoryRouter.post(
  "/transfers/:id/accept",
  requireRole(canManageStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const transfer = await acceptStockTransfer(
        routeParam(req.params.id),
        branchId,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(transfer);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/inventory/transfers/:id/accept", error);
      res.status(500).json({ error: "Failed to accept transfer" });
    }
  },
);

inventoryRouter.post(
  "/transfers/:id/reject",
  requireRole(canManageStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const reason =
        typeof req.body.reason === "string" ? req.body.reason : "";
      const transfer = await rejectStockTransfer(
        routeParam(req.params.id),
        branchId,
        { id: req.user!.id, name: req.user!.name },
        reason,
      );
      res.json(transfer);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/inventory/transfers/:id/reject", error);
      res.status(500).json({ error: "Failed to reject transfer" });
    }
  },
);

inventoryRouter.post(
  "/transfers/:id/partial-accept",
  requireRole(canManageStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id, req.organizationId!);
      const transfer = await partialAcceptStockTransfer(
        routeParam(req.params.id),
        branchId,
        { id: req.user!.id, name: req.user!.name },
        req.body as PartialAcceptTransferInput,
      );
      res.json(transfer);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/inventory/transfers/:id/partial-accept", error);
      res.status(500).json({ error: "Failed to partially accept transfer" });
    }
  },
);

inventoryRouter.post(
  "/transfers/:id/cancel",
  requireRole(canManageStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const fromBranchId =
        req.user!.role === "Admin"
          ? undefined
          : await getUserBranch(req.user!.id, req.organizationId!);
      const transferId = routeParam(req.params.id);
      const existing = await getStockTransferById(transferId);
      if (!existing) {
        res.status(404).json({ error: "Transfer not found" });
        return;
      }
      const sourceBranchId = fromBranchId ?? existing.fromBranchId;
      const transfer = await cancelStockTransfer(
        transferId,
        sourceBranchId,
        { id: req.user!.id, name: req.user!.name },
      );
      res.json(transfer);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/inventory/transfers/:id/cancel", error);
      res.status(500).json({ error: "Failed to cancel transfer" });
    }
  },
);

inventoryRouter.patch(
  "/transfers/:id/shipping",
  requireRole(canManageStockTransfers),
  async (req, res) => {
    try {
      const { contactPersonName, contactPersonPhone, courierCompany, dispatchDate } =
        req.body;
      if (!contactPersonName?.trim()) {
        res.status(400).json({ error: "Contact person name is required." });
        return;
      }
      if (!contactPersonPhone?.trim()) {
        res.status(400).json({ error: "Contact person phone is required." });
        return;
      }
      if (!courierCompany?.trim()) {
        res.status(400).json({ error: "Courier company is required." });
        return;
      }
      if (!dispatchDate) {
        res.status(400).json({ error: "Dispatch date is required." });
        return;
      }
      const transfer = await saveTransferShipping(routeParam(req.params.id), {
        contactPersonName,
        contactPersonPhone,
        courierCompany,
        dispatchDate,
      });
      res.json(transfer);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/inventory/transfers/:id/shipping", error);
      res.status(500).json({ error: "Failed to save shipping details" });
    }
  },
);

inventoryRouter.get(
  "/transfers/:id/invoice/download",
  requireRole(canViewStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const transferId = routeParam(req.params.id);
      const existing = await getStockTransferById(transferId);
      if (!existing) {
        res.status(404).json({ error: "Transfer not found." });
        return;
      }

      const { transfer, pdfBuffer } = await regenerateTransferInvoicePdf(
        transferId,
        req.organizationId!,
      );

      const isInvoice = transfer.documentType === "Wholesale GST Invoice";
      const filename = isInvoice
        ? `invoice-${transfer.invoiceNo ?? transfer.transferNo}.pdf`
        : `challan-${transfer.transferNo}.pdf`;

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Transfer-Data": JSON.stringify(transfer),
      });
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("GET /api/inventory/transfers/:id/invoice/download", error);
      res.status(500).json({ error: "Failed to download invoice." });
    }
  },
);

inventoryRouter.post(
  "/transfers/:id/invoice",
  requireRole(canManageStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const { contactPersonName, contactPersonPhone, courierCompany, dispatchDate } =
        req.body;
      if (!contactPersonName?.trim()) {
        res.status(400).json({ error: "Contact person name is required." });
        return;
      }
      if (!contactPersonPhone?.trim()) {
        res.status(400).json({ error: "Contact person phone is required." });
        return;
      }
      if (!courierCompany?.trim()) {
        res.status(400).json({ error: "Courier company is required." });
        return;
      }
      if (!dispatchDate) {
        res.status(400).json({ error: "Dispatch date is required." });
        return;
      }

      const settings = await getShopSettings(req.organizationId!);
      const { transfer, pdfBuffer } = await saveTransferShippingAndGenerateInvoice(
        routeParam(req.params.id),
        { contactPersonName, contactPersonPhone, courierCompany, dispatchDate },
        settings.state ?? "",
      );

      const isInvoice = transfer.documentType === "Wholesale GST Invoice";
      const filename = isInvoice
        ? `invoice-${transfer.invoiceNo ?? transfer.transferNo}.pdf`
        : `challan-${transfer.transferNo}.pdf`;

      res.set({
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "X-Transfer-Data": Buffer.from(JSON.stringify(transfer), "utf8").toString(
          "base64",
        ),
      });
      res.send(pdfBuffer);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/inventory/transfers/:id/invoice", error);
      const message =
        error instanceof Error ? error.message : "Failed to generate invoice.";
      res.status(500).json({ error: message });
    }
  },
);

inventoryRouter.post(
  "/transfers",
  requireRole(canManageStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const sellingBranchId = await getUserBranch(req.user!.id, req.organizationId!);
      const result = await createStockTransfer(
        req.body as CreateStockTransferInput,
        { id: req.user!.id, name: req.user!.name },
        req.organizationId!,
        sellingBranchId,
      );
      res.status(201).json(result);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/inventory/transfers", error);
      res.status(500).json({ error: "Failed to transfer stock" });
    }
  },
);

inventoryRouter.get(
  "/transfers",
  requireRole(canViewStockTransfers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const transfers = await listStockTransfers(req.organizationId!);
      res.json(transfers);
    } catch (error) {
      console.error("GET /api/inventory/transfers", error);
      res.status(500).json({ error: "Failed to fetch stock transfers" });
    }
  },
);

inventoryRouter.post(
  "/:id/transfer",
  requireRole(canManageStockTransfers),
  async (req, res) => {
    try {
      const unitIds = Array.isArray(req.body.unitIds)
        ? req.body.unitIds.map(String)
        : [];
      const toBranchId =
        typeof req.body.toBranchId === "string" ? req.body.toBranchId : "";

      const product = await transferInventoryUnits(
        routeParam(req.params.id),
        unitIds,
        toBranchId,
      );

      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      res.json(product);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("POST /api/inventory/:id/transfer", error);
      res.status(500).json({ error: "Failed to transfer units" });
    }
  },
);

inventoryRouter.delete(
  "/units/:unitId",
  requireRole(canWriteInventory),
  async (req, res) => {
    try {
      const product = await deleteInventoryUnit(routeParam(req.params.unitId));
      if (!product) {
        res.status(404).json({ error: "Unit not found" });
        return;
      }
      res.json(product);
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/inventory/units/:unitId", error);
      res.status(500).json({ error: "Failed to remove unit" });
    }
  },
);

inventoryRouter.patch(
  "/:id",
  requireRole(canWriteInventory),
  async (req, res) => {
    try {
      const product = await updateProduct(
        routeParam(req.params.id),
        req.body as UpdateProductInput,
      );
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.json(product);
    } catch (error) {
      console.error("PATCH /api/inventory/:id", error);
      res.status(500).json({ error: "Failed to update product" });
    }
  },
);

inventoryRouter.delete(
  "/:id",
  requireRole(canDeleteProduct),
  async (req, res) => {
    try {
      const deleted = await deleteProduct(routeParam(req.params.id));
      if (!deleted) {
        res.status(404).json({ error: "Product not found" });
        return;
      }
      res.status(204).send();
    } catch (error) {
      if (error instanceof InventoryError) {
        res.status(error.statusCode).json({ error: error.message });
        return;
      }
      console.error("DELETE /api/inventory/:id", error);
      res.status(500).json({ error: "Failed to delete product" });
    }
  },
);

inventoryRouter.post(
  "/:id/units",
  requireRole(canWriteInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const quantity = Number(req.body.quantity);
      if (!quantity || quantity < 1) {
        res.status(400).json({ error: "Quantity must be at least 1" });
        return;
      }

      const product = await addQuantityToProduct(
        routeParam(req.params.id),
        quantity,
        req.user
          ? { id: req.user.id, name: req.user.name }
          : undefined,
      );
      if (!product) {
        res.status(404).json({ error: "Product not found" });
        return;
      }

      res.json(product);
    } catch (error) {
      console.error("POST /api/inventory/:id/units", error);
      res.status(500).json({ error: "Failed to add units" });
    }
  },
);
