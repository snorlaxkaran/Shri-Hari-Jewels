import { InventoryUnitStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { organizationBranchFilter } from "../branches/access.js";
import type { InventoryItem } from "../../types.js";
import { InventoryError } from "./service.js";
import { toInventoryItem } from "./mappers.js";
import { syncProductStockInTx } from "./stock-sync.js";
import { getCurrentMarketRates } from "../market-rates/service.js";
import type { AuditActor } from "./audit.js";

export type HoldUnitForCustomerInput = {
  customerName: string;
  customerId?: string;
  notes?: string;
};

const productInclude = {
  branch: true,
  units: {
    include: { branch: true, sale: true },
    orderBy: { createdAt: "asc" as const },
  },
  images: { orderBy: { sortOrder: "asc" as const } },
};

const loadProductForUnit = async (unitId: string) => {
  const unit = await prisma.inventoryUnit.findUnique({
    where: { id: unitId },
    select: { productId: true },
  });
  if (!unit) return null;

  return prisma.product.findUnique({
    where: { id: unit.productId },
    include: productInclude,
  });
};

export const holdUnitForCustomer = async (
  unitId: string,
  input: HoldUnitForCustomerInput,
  actor: AuditActor,
  organizationId: string,
  branchId?: string,
): Promise<InventoryItem> => {
  const customerName = input.customerName.trim();
  if (!customerName) {
    throw new InventoryError("Customer name is required to set an item aside.");
  }

  const unit = await prisma.inventoryUnit.findFirst({
    where: {
      id: unitId,
      ...organizationBranchFilter(organizationId, branchId),
    },
    include: { sale: true },
  });

  if (!unit) throw new InventoryError("Unit not found.", 404);
  if (branchId && unit.branchId !== branchId) {
    throw new InventoryError("This item is not assigned to your store.", 403);
  }
  if (unit.status !== InventoryUnitStatus.Available) {
    throw new InventoryError(
      `This item is ${unit.status} and cannot be set aside.`,
      400,
    );
  }
  if (unit.sale) {
    throw new InventoryError("This item already has a sale record.", 400);
  }

  if (input.customerId) {
    const customer = await prisma.customer.findFirst({
      where: { id: input.customerId, organizationId },
    });
    if (!customer) throw new InventoryError("Customer not found.", 404);
  }

  const notes = input.notes?.trim() || null;
  const now = new Date();

  await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.update({
      where: { id: unit.id },
      data: {
        status: InventoryUnitStatus.Reserved,
        heldForCustomerName: customerName,
        heldForCustomerId: input.customerId ?? null,
        heldAt: now,
        heldByName: actor.name,
        holdNotes: notes,
      },
    });

    await syncProductStockInTx(tx, unit.productId, {
      reason: `Set aside for ${customerName}`,
      performedByName: actor.name,
      unitId: unit.id,
      itemCode: unit.itemCode,
      previousUnitStatus: InventoryUnitStatus.Available,
      newUnitStatus: InventoryUnitStatus.Reserved,
    });
  });

  const product = await loadProductForUnit(unitId);
  if (!product) throw new InventoryError("Product not found.", 404);

  const marketRates = await getCurrentMarketRates(organizationId);
  return toInventoryItem(product, { marketRates, stockBranchId: branchId });
};

export const releaseStaffHold = async (
  unitId: string,
  actor: AuditActor,
  organizationId: string,
  branchId?: string,
): Promise<InventoryItem> => {
  const unit = await prisma.inventoryUnit.findFirst({
    where: {
      id: unitId,
      ...organizationBranchFilter(organizationId, branchId),
    },
    include: { sale: true },
  });

  if (!unit) throw new InventoryError("Unit not found.", 404);
  if (branchId && unit.branchId !== branchId) {
    throw new InventoryError("This item is not assigned to your store.", 403);
  }
  if (!unit.heldForCustomerName) {
    throw new InventoryError(
      "This item is not set aside by staff. Use Sales to cancel a pending payment instead.",
      400,
    );
  }
  if (unit.sale?.paymentStatus === "Pending") {
    throw new InventoryError(
      "This item has a pending UPI sale. Cancel the sale from Sales instead.",
      400,
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.update({
      where: { id: unit.id },
      data: {
        status: InventoryUnitStatus.Available,
        heldForCustomerName: null,
        heldForCustomerId: null,
        heldAt: null,
        heldByName: null,
        holdNotes: null,
      },
    });

    await syncProductStockInTx(tx, unit.productId, {
      reason: "Staff hold released",
      performedByName: actor.name,
      unitId: unit.id,
      itemCode: unit.itemCode,
      previousUnitStatus: InventoryUnitStatus.Reserved,
      newUnitStatus: InventoryUnitStatus.Available,
    });
  });

  const product = await loadProductForUnit(unitId);
  if (!product) throw new InventoryError("Product not found.", 404);

  const marketRates = await getCurrentMarketRates(organizationId);
  return toInventoryItem(product, { marketRates, stockBranchId: branchId });
};
