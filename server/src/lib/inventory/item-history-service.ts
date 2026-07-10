import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import { InventoryError } from "./service.js";
import type {
  ItemCodeHistory,
  ItemCodeHistoryEvent,
  ItemCodeStoneRequirement,
} from "../../types.js";

const parseJson = (value: string | null): Record<string, unknown> | null => {
  if (!value) return null;
  try {
    return JSON.parse(value) as Record<string, unknown>;
  } catch {
    return null;
  }
};

const actionToEventType = (
  action: string,
  newValue: Record<string, unknown> | null,
): ItemCodeHistoryEvent["type"] => {
  switch (action) {
    case "UnitCreated":
      return "entry";
    case "TransferOut":
      return "transfer_out";
    case "TransferAccepted":
      return "transfer_in";
    case "TransferReturned":
    case "TransferRejected":
    case "TransferCancelled":
      return "transfer_return";
    case "StatusChange":
      if (newValue?.status === "Sold") return "sale";
      return "status_change";
    default:
      return "other";
  }
};

const formatAuditTitle = (
  action: string,
  newValue: Record<string, unknown> | null,
  previousValue: Record<string, unknown> | null,
): string => {
  switch (action) {
    case "UnitCreated":
      return "Added to stock";
    case "TransferOut":
      return "Transferred out";
    case "TransferAccepted":
      return "Transfer accepted at branch";
    case "TransferReturned":
      return "Returned from transfer";
    case "TransferRejected":
      return "Transfer rejected";
    case "TransferCancelled":
      return "Transfer cancelled";
    case "StatusChange": {
      const from = previousValue?.status;
      const to = newValue?.status;
      if (to === "Sold") return "Sold";
      if (to === "Reserved") return "Reserved for sale";
      if (to === "Available" && from === "Reserved") return "Sale cancelled — back in stock";
      if (to === "Available") return "Marked available";
      if (to === "InTransit") return "In transit";
      if (to === "Transferred") return "Transferred (challan)";
      return `Status: ${String(from ?? "?")} → ${String(to ?? "?")}`;
    }
    default:
      return action;
  }
};

const formatAuditDescription = (
  action: string,
  newValue: Record<string, unknown> | null,
  reason: string | null,
): string | undefined => {
  const parts: string[] = [];
  if (newValue?.transferNo) parts.push(`Transfer ${String(newValue.transferNo)}`);
  if (newValue?.documentType) parts.push(String(newValue.documentType));
  if (newValue?.reason) parts.push(String(newValue.reason));
  if (newValue?.source) parts.push(`Source: ${String(newValue.source)}`);
  if (reason && !parts.includes(reason)) parts.push(reason);
  return parts.length ? parts.join(" · ") : undefined;
};

const auditToEvent = (log: {
  id: string;
  action: string;
  previousValue: string | null;
  newValue: string | null;
  reason: string | null;
  performedByName: string;
  createdAt: Date;
}): ItemCodeHistoryEvent => {
  const previousValue = parseJson(log.previousValue);
  const newValue = parseJson(log.newValue);
  const reference =
    (newValue?.transferNo as string | undefined) ??
    (newValue?.invoiceNo as string | undefined);

  return {
    id: log.id,
    date: log.createdAt.toISOString(),
    type: actionToEventType(log.action, newValue),
    action: log.action,
    title: formatAuditTitle(log.action, newValue, previousValue),
    description: formatAuditDescription(log.action, newValue, log.reason),
    reference,
    performedByName: log.performedByName,
    metadata: newValue ?? undefined,
  };
};

const buildDesignStoneRequirements = (
  elements: Array<{
    name: string;
    qtyPerSet: number;
    motif: {
      name: string;
      stones: Array<{ stoneType: string; qtyPerMotif: number }>;
    } | null;
  }>,
): ItemCodeStoneRequirement[] => {
  const rows: ItemCodeStoneRequirement[] = [];
  for (const element of elements) {
    if (!element.motif?.stones.length) continue;
    for (const stone of element.motif.stones) {
      rows.push({
        motifName: element.motif.name,
        elementName: element.name,
        stoneType: stone.stoneType,
        qtyPerPiece: stone.qtyPerMotif * element.qtyPerSet,
        source: "design_requirement",
      });
    }
  }
  return rows;
};

export const getItemCodeHistory = async (
  itemCode: string,
  organizationId: string,
): Promise<ItemCodeHistory> => {
  const normalized = itemCode.trim();
  if (!normalized) {
    throw new InventoryError("Item code is required.", 400);
  }

  const unit = await prisma.inventoryUnit.findUnique({
    where: {
      organizationId_itemCode: { organizationId, itemCode: normalized },
    },
    include: {
      branch: { select: { name: true } },
      product: {
        include: {
          images: { orderBy: { sortOrder: "asc" }, take: 1 },
          productionRun: {
            include: {
              design: {
                include: {
                  elements: {
                    orderBy: { sortOrder: "asc" },
                    include: {
                      motif: {
                        include: {
                          stones: { orderBy: { sortOrder: "asc" } },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
      sale: {
        include: {
          invoice: { select: { invoiceNo: true } },
          customer: { select: { name: true, mobile: true } },
        },
      },
    },
  });

  if (!unit) {
    throw new InventoryError(`Item code not found: ${normalized}`, 404);
  }

  const auditLogs = await prisma.inventoryAuditLog.findMany({
    where: {
      OR: [{ itemCode: normalized }, { entityId: unit.id }],
      NOT: { action: "StockSync" },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  const transferItems = await prisma.stockTransferItem.findMany({
    where: { itemCode: normalized },
    include: {
      transfer: {
        include: {
          fromBranch: { select: { name: true } },
          toBranch: { select: { name: true } },
          customer: { select: { name: true } },
          customerBranch: { select: { name: true } },
        },
      },
    },
    orderBy: { transfer: { createdAt: "asc" } },
  });

  const events: ItemCodeHistoryEvent[] = auditLogs.map(auditToEvent);

  const auditTransferNos = new Set(
    events
      .map((event) => event.reference)
      .filter((ref): ref is string => Boolean(ref)),
  );

  for (const row of transferItems) {
    const transfer = row.transfer;
    if (!auditTransferNos.has(transfer.transferNo)) {
      events.push({
        id: `transfer-out-${row.id}`,
        date: transfer.createdAt.toISOString(),
        type: "transfer_out",
        action: "TransferOut",
        title: "Transferred out",
        description: [
          transfer.transferNo,
          transfer.documentType,
          `${transfer.fromBranch.name} → ${
            transfer.customerBranch?.name ??
            transfer.customer?.name ??
            transfer.toBranch.name
          }`,
        ].join(" · "),
        reference: transfer.transferNo,
        performedByName: transfer.createdByName,
        metadata: {
          transferId: transfer.id,
          accepted: row.accepted,
          price: moneyToNumber(row.price),
        },
      });
    }

    if (
      transfer.acceptedAt &&
      row.accepted &&
      transfer.status !== "Pending" &&
      transfer.status !== "Rejected"
    ) {
      const acceptKey = `transfer-in-${row.id}`;
      const hasAccept = events.some(
        (event) =>
          event.action === "TransferAccepted" &&
          event.reference === transfer.transferNo,
      );
      if (!hasAccept) {
        events.push({
          id: acceptKey,
          date: transfer.acceptedAt.toISOString(),
          type: "transfer_in",
          action: "TransferAccepted",
          title: "Transfer accepted",
          description: `Received at ${transfer.toBranch.name}`,
          reference: transfer.transferNo,
          performedByName: transfer.acceptedByName ?? transfer.createdByName,
          metadata: { transferId: transfer.id },
        });
      }
    }

    if (!row.accepted && transfer.rejectionReason) {
      const hasReturn = events.some(
        (event) =>
          event.type === "transfer_return" &&
          event.reference === transfer.transferNo,
      );
      if (!hasReturn) {
        events.push({
          id: `transfer-return-${row.id}`,
          date: (transfer.acceptedAt ?? transfer.createdAt).toISOString(),
          type: "transfer_return",
          action: "TransferReturned",
          title: "Returned from transfer",
          description: transfer.rejectionReason,
          reference: transfer.transferNo,
          performedByName: transfer.acceptedByName ?? transfer.createdByName,
          metadata: { transferId: transfer.id },
        });
      }
    }
  }

  const hasEntry = events.some((event) => event.type === "entry");
  if (!hasEntry) {
    events.push({
      id: `entry-${unit.id}`,
      date: unit.createdAt.toISOString(),
      type: "entry",
      action: "UnitCreated",
      title: "Added to stock",
      description: unit.product.productionRun
        ? `Production run ${unit.product.productionRun.runNo}`
        : undefined,
      performedByName: "System",
    });
  }

  if (unit.sale) {
    const hasSaleEvent = events.some((event) => event.type === "sale");
    const invoiceNo = unit.sale.invoice?.invoiceNo;
    if (!hasSaleEvent) {
      events.push({
        id: `sale-${unit.sale.id}`,
        date: unit.sale.soldAt.toISOString(),
        type: "sale",
        action: "Sold",
        title: "Sold",
        description: [
          unit.sale.customerName ?? unit.sale.customerPhone,
          unit.sale.saleSource !== "Direct" ? unit.sale.saleSource : null,
        ]
          .filter(Boolean)
          .join(" · "),
        reference: invoiceNo ?? undefined,
        performedByName: unit.sale.createdByName ?? "System",
        metadata: {
          dealPrice: moneyToNumber(unit.sale.dealPrice),
          listPrice: moneyToNumber(unit.sale.listPrice),
          paymentMode: unit.sale.paymentMode,
        },
      });
    }
  }

  events.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  );

  const designElements = unit.product.productionRun?.design.elements ?? [];
  const designStones = buildDesignStoneRequirements(designElements);

  return {
    itemCode: normalized,
    spec: {
      unitId: unit.id,
      productId: unit.product.id,
      productName: unit.product.name,
      sku: unit.product.sku,
      category: unit.product.category,
      metal: unit.product.metal,
      purity: unit.product.purity,
      weightGrams: unit.product.weightGrams,
      makingCharges: moneyToNumber(unit.product.makingCharges),
      stoneCarat: unit.product.stoneCarat ?? undefined,
      listPrice: unit.listPrice ? moneyToNumber(unit.listPrice) : undefined,
      status: unit.status,
      branchName: unit.branch.name,
      hallmarkNumber: unit.hallmarkNumber ?? undefined,
      hallmarkCenter: unit.hallmarkCenter ?? undefined,
      createdAt: unit.createdAt.toISOString(),
      imageUrl: unit.product.images[0]?.url,
      designStones,
      designStonesNote:
        designStones.length > 0
          ? "Stone list from design requirements (not per-piece tracking)."
          : undefined,
      productionRunNo: unit.product.productionRun?.runNo,
    },
    sale: unit.sale
      ? {
          saleId: unit.sale.id,
          invoiceNo: unit.sale.invoice?.invoiceNo,
          customerName: unit.sale.customerName ?? unit.sale.customerPhone,
          dealPrice: moneyToNumber(unit.sale.dealPrice),
          listPrice: moneyToNumber(unit.sale.listPrice),
          paymentMode: unit.sale.paymentMode,
          soldAt: unit.sale.soldAt.toISOString(),
          saleSource: unit.sale.saleSource,
          stockTransferId: unit.sale.stockTransferId ?? undefined,
        }
      : undefined,
    events,
  };
};
