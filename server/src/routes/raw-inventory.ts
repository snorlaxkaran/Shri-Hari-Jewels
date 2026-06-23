import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/db.js";
import {
  canReadRawInventory,
  canWriteRawInventory,
} from "../lib/auth/permissions.js";
import { listAuditLogs } from "../lib/raw-inventory/audit.js";
import {
  adjustMetalLot,
  createMetalLot,
  getMetalLot,
  getRawInventorySummary,
  listMetalLots,
  RawInventoryError,
  transferMetalLot,
  updateMetalLot,
} from "../lib/raw-inventory/metal-service.js";
import {
  adjustStoneLot,
  createStoneLot,
  getStoneLot,
  listStoneLots,
  transferStoneLot,
  updateStoneLot,
} from "../lib/raw-inventory/stone-service.js";
import {
  authenticate,
  requireRole,
  type AuthenticatedRequest,
} from "../middleware/auth.js";
import { attachOrganization } from "../middleware/organization.js";
import { DEFAULT_BRANCH_ID } from "../lib/branches/constants.js";
import { routeParam } from "../lib/route-param.js";
import type {
  AdjustMetalLotInput,
  AdjustStoneLotInput,
  NewMetalLotInput,
  NewStoneLotInput,
  TransferMetalLotInput,
  TransferStoneLotInput,
  UpdateMetalLotInput,
  UpdateStoneLotInput,
} from "../types.js";

export const rawInventoryRouter = Router();

rawInventoryRouter.use(authenticate);
rawInventoryRouter.use(attachOrganization);

const actorFrom = (req: AuthenticatedRequest) => ({
  id: req.user!.id,
  name: req.user!.name,
});

const getUserBranch = async (userId: string): Promise<string> => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { branches: { take: 1 } },
  });

  if (user?.defaultBranchId) {
    return user.defaultBranchId;
  }

  if (user?.branches.length) {
    return user.branches[0].branchId;
  }

  return DEFAULT_BRANCH_ID;
};

const mapRawInventoryError = (error: unknown): RawInventoryError | null => {
  if (error instanceof RawInventoryError) return error;

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  ) {
    return new RawInventoryError(
      "A lot with this number already exists. Refresh and try again.",
    );
  }

  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2003"
  ) {
    return new RawInventoryError(
      "Your branch is not set up in the system. Contact an administrator.",
    );
  }

  return null;
};

rawInventoryRouter.get(
  "/summary",
  requireRole(canReadRawInventory),
  async (_req, res) => {
    try {
      const summary = await getRawInventorySummary();
      res.json(summary);
    } catch (error) {
      console.error("GET /api/raw-inventory/summary", error);
      res.status(500).json({ error: "Failed to fetch raw inventory summary" });
    }
  },
);

rawInventoryRouter.get(
  "/audit",
  requireRole(canReadRawInventory),
  async (req, res) => {
    try {
      const stockType = req.query.stockType as "Metal" | "Stone" | undefined;
      const stockId = req.query.stockId as string | undefined;
      const logs = await listAuditLogs(stockType, stockId);
      res.json(logs);
    } catch (error) {
      console.error("GET /api/raw-inventory/audit", error);
      res.status(500).json({ error: "Failed to fetch audit logs" });
    }
  },
);

rawInventoryRouter.get(
  "/metal",
  requireRole(canReadRawInventory),
  async (_req, res) => {
    try {
      res.json(await listMetalLots());
    } catch (error) {
      console.error("GET /api/raw-inventory/metal", error);
      res.status(500).json({ error: "Failed to fetch metal lots" });
    }
  },
);

rawInventoryRouter.get(
  "/metal/:id",
  requireRole(canReadRawInventory),
  async (req, res) => {
    try {
      res.json(await getMetalLot(routeParam(req.params.id)));
    } catch (error) {
      if (error instanceof RawInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error("GET /api/raw-inventory/metal/:id", error);
      res.status(500).json({ error: "Failed to fetch metal lot" });
    }
  },
);

rawInventoryRouter.post(
  "/metal",
  requireRole(canWriteRawInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id);
      const lot = await createMetalLot(
        req.body as NewMetalLotInput,
        actorFrom(req),
        branchId,
      );
      res.status(201).json(lot);
    } catch (error) {
      const mapped = mapRawInventoryError(error);
      if (mapped) {
        res.status(mapped.status).json({ error: mapped.message });
        return;
      }
      console.error("POST /api/raw-inventory/metal", error);
      res.status(500).json({ error: "Failed to create metal lot" });
    }
  },
);

rawInventoryRouter.patch(
  "/metal/:id",
  requireRole(canWriteRawInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lot = await updateMetalLot(
        routeParam(req.params.id),
        req.body as UpdateMetalLotInput,
        actorFrom(req),
      );
      res.json(lot);
    } catch (error) {
      if (error instanceof RawInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/raw-inventory/metal/:id", error);
      res.status(500).json({ error: "Failed to update metal lot" });
    }
  },
);

rawInventoryRouter.post(
  "/metal/:id/transfer",
  requireRole(canWriteRawInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lot = await transferMetalLot(
        routeParam(req.params.id),
        req.body as TransferMetalLotInput,
        actorFrom(req),
      );
      res.json(lot);
    } catch (error) {
      if (error instanceof RawInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error("POST /api/raw-inventory/metal/:id/transfer", error);
      res.status(500).json({ error: "Failed to transfer metal lot" });
    }
  },
);

rawInventoryRouter.post(
  "/metal/:id/adjust",
  requireRole(canWriteRawInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lot = await adjustMetalLot(
        routeParam(req.params.id),
        req.body as AdjustMetalLotInput,
        actorFrom(req),
      );
      res.json(lot);
    } catch (error) {
      if (error instanceof RawInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error("POST /api/raw-inventory/metal/:id/adjust", error);
      res.status(500).json({ error: "Failed to adjust metal lot" });
    }
  },
);

rawInventoryRouter.get(
  "/stones",
  requireRole(canReadRawInventory),
  async (_req, res) => {
    try {
      res.json(await listStoneLots());
    } catch (error) {
      console.error("GET /api/raw-inventory/stones", error);
      res.status(500).json({ error: "Failed to fetch stone lots" });
    }
  },
);

rawInventoryRouter.get(
  "/stones/:id",
  requireRole(canReadRawInventory),
  async (req, res) => {
    try {
      res.json(await getStoneLot(routeParam(req.params.id)));
    } catch (error) {
      if (error instanceof RawInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error("GET /api/raw-inventory/stones/:id", error);
      res.status(500).json({ error: "Failed to fetch stone lot" });
    }
  },
);

rawInventoryRouter.post(
  "/stones",
  requireRole(canWriteRawInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const branchId = await getUserBranch(req.user!.id);
      const lot = await createStoneLot(
        req.body as NewStoneLotInput,
        actorFrom(req),
        branchId,
      );
      res.status(201).json(lot);
    } catch (error) {
      if (error instanceof RawInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error("POST /api/raw-inventory/stones", error);
      res.status(500).json({ error: "Failed to create stone lot" });
    }
  },
);

rawInventoryRouter.patch(
  "/stones/:id",
  requireRole(canWriteRawInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lot = await updateStoneLot(
        routeParam(req.params.id),
        req.body as UpdateStoneLotInput,
        actorFrom(req),
      );
      res.json(lot);
    } catch (error) {
      if (error instanceof RawInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error("PATCH /api/raw-inventory/stones/:id", error);
      res.status(500).json({ error: "Failed to update stone lot" });
    }
  },
);

rawInventoryRouter.post(
  "/stones/:id/transfer",
  requireRole(canWriteRawInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lot = await transferStoneLot(
        routeParam(req.params.id),
        req.body as TransferStoneLotInput,
        actorFrom(req),
      );
      res.json(lot);
    } catch (error) {
      if (error instanceof RawInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error("POST /api/raw-inventory/stones/:id/transfer", error);
      res.status(500).json({ error: "Failed to transfer stone lot" });
    }
  },
);

rawInventoryRouter.post(
  "/stones/:id/adjust",
  requireRole(canWriteRawInventory),
  async (req: AuthenticatedRequest, res) => {
    try {
      const lot = await adjustStoneLot(
        routeParam(req.params.id),
        req.body as AdjustStoneLotInput,
        actorFrom(req),
      );
      res.json(lot);
    } catch (error) {
      if (error instanceof RawInventoryError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      console.error("POST /api/raw-inventory/stones/:id/adjust", error);
      res.status(500).json({ error: "Failed to adjust stone lot" });
    }
  },
);
