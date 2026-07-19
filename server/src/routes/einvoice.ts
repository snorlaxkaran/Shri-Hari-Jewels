import { Router } from "express";
import QRCode from "qrcode";
import {
  cancelEInvoice,
  generateEInvoice,
  getEInvoiceRecordForInvoice,
  listEInvoiceRecords,
  type EInvoiceRecordDto,
} from "../lib/einvoice/service.js";
import { EinvoiceCancellationError, EinvoiceError } from "../lib/einvoice/errors.js";
import type { NicCancelReason } from "../lib/einvoice/nic-client.js";
import { canManageCustomers } from "../lib/auth/permissions.js";
import { routeParam } from "../lib/route-param.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { requireOrganization } from "../middleware/organization.js";
import { prisma } from "../lib/db.js";

export const einvoiceRouter = Router();

const VALID_CANCEL_REASONS = new Set<NicCancelReason>(["1", "2", "3", "4"]);

const handleEinvoiceError = (res: import("express").Response, error: unknown) => {
  if (error instanceof EinvoiceCancellationError) {
    res.status(409).json({ error: error.message, code: error.code });
    return;
  }
  if (error instanceof EinvoiceError) {
    const status = error.code === "INVOICE_NOT_FOUND" ? 404 : 400;
    res.status(status).json({
      error: error.message,
      code: error.code,
      details: error.details,
    });
    return;
  }
  res.status(500).json({ error: "Unexpected e-Invoice error." });
};

einvoiceRouter.get(
  "/",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const records = await listEInvoiceRecords(req.organizationId!);
      res.json({ records });
    } catch (error) {
      console.error("GET /api/einvoice", error);
      res.status(500).json({ error: "Failed to list e-invoice records." });
    }
  },
);

einvoiceRouter.get(
  "/invoice/:invoiceId",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const record = await getEInvoiceRecordForInvoice(
        req.organizationId!,
        routeParam(req.params.invoiceId),
      );
      res.json({ record });
    } catch (error) {
      console.error("GET /api/einvoice/invoice/:invoiceId", error);
      res.status(500).json({ error: "Failed to fetch e-invoice record." });
    }
  },
);

einvoiceRouter.get(
  "/records/:id/qr.png",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const record = await prisma.eInvoiceRecord.findFirst({
        where: {
          id: routeParam(req.params.id),
          organizationId: req.organizationId!,
        },
      });
      if (!record?.qrCodeData) {
        res.status(404).json({ error: "QR code not available." });
        return;
      }

      const png = await QRCode.toBuffer(record.qrCodeData, {
        type: "png",
        width: 256,
        margin: 1,
      });
      res.setHeader("Content-Type", "image/png");
      res.send(png);
    } catch (error) {
      console.error("GET /api/einvoice/records/:id/qr.png", error);
      res.status(500).json({ error: "Failed to render QR code." });
    }
  },
);

einvoiceRouter.post(
  "/generate",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as {
        invoiceId?: string;
        saleId?: string;
        force?: boolean;
      };
      if (!body.invoiceId) {
        res.status(400).json({ error: "invoiceId is required." });
        return;
      }
      const record: EInvoiceRecordDto = await generateEInvoice({
        organizationId: req.organizationId!,
        invoiceId: body.invoiceId,
        saleId: body.saleId,
        force: body.force === true,
      });
      const statusCode = record.status === "Failed" ? 422 : 201;
      res.status(statusCode).json({ record });
    } catch (error) {
      console.error("POST /api/einvoice/generate", error);
      handleEinvoiceError(res, error);
    }
  },
);

einvoiceRouter.post(
  "/records/:id/cancel",
  authenticate,
  requireOrganization,
  requireRole(canManageCustomers),
  async (req: AuthenticatedRequest, res) => {
    try {
      const body = req.body as { reason?: string; remarks?: string };
      const reason = body.reason as NicCancelReason | undefined;
      if (!reason || !VALID_CANCEL_REASONS.has(reason)) {
        res.status(400).json({
          error:
            "reason is required (1=Duplicate, 2=Data entry mistake, 3=Order cancelled, 4=Others).",
        });
        return;
      }

      const record = await cancelEInvoice({
        organizationId: req.organizationId!,
        recordId: routeParam(req.params.id),
        reason,
        remarks: body.remarks,
      });
      res.json({ record });
    } catch (error) {
      console.error("POST /api/einvoice/records/:id/cancel", error);
      handleEinvoiceError(res, error);
    }
  },
);
