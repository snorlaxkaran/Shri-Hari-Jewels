import { InventoryUnitStatus, ProductStockStatus, SalePaymentStatus, StockTransferStatus } from "@prisma/client";
import { prisma } from "../db.js";
import type {
  Branch,
  StockTransfer as DbStockTransfer,
  StockTransferItem as DbStockTransferItem,
} from "@prisma/client";
import type {
  CreateStockTransferInput,
  InventoryItem,
  NewProductInput,
  StockTransfer,
  UpdateProductInput,
} from "../../types.js";
import { CATEGORY_COLORS, type ProductCategory } from "./categories.js";
import { toInventoryItem } from "./mappers.js";
import { generateSku, generateUnitCodes } from "./sku.js";
import { reconcileInventoryWithSales } from "./reconcile.js";
import { backfillMissingWholesaleSales } from "../sales/backfill-wholesale.js";
import { getStockStatus } from "./status.js";
import { syncProductStockInTx } from "./stock-sync.js";
import {
  recordInventoryAudit,
  recordUnitTransferOutInTx,
  recordUnitsCreatedInTx,
  type AuditActor,
} from "./audit.js";
import { organizationBranchFilter, organizationTransferFromFilter, getOrganizationHeadOfficeBranchId } from "../branches/access.js";
import { getBranchOrganizationId } from "../organizations/access.js";
import { moneyToNumber, sumMoney } from "../money.js";
import { repairCompletedRunInventorySkus } from "../production-runs/run-completion.js";
import { toStockTransferDto } from "./transfer-actions.js";
import { createEntryVoucherInTx } from "./vouchers-service.js";

export type EntryProductOptions = {
  entryVerification?: boolean;
  voucherId?: string;
};
import { resolveCustomerBranchForTransfer } from "../customers/branches.js";
import { CustomerError } from "../customers/service.js";
import { getCurrentMarketRates } from "../market-rates/service.js";
import { computeLiveListPriceForProduct } from "./unit-pricing.js";
import {
  backfillTransferredUnitBranches,
  getLatestTransferLocationByItemCode,
} from "./transfer-locations.js";

const productInclude = {
  branch: true,
  units: {
    include: { branch: true, sale: true },
    orderBy: { createdAt: "asc" as const },
  },
  images: { orderBy: { sortOrder: "asc" as const } },
};

export type InventorySortField =
  | "createdAt"
  | "weightGrams"
  | "price"
  | "category";

export type InventorySortOrder = "asc" | "desc";

export type InventoryListOptions = {
  sortBy?: InventorySortField;
  sortOrder?: InventorySortOrder;
};

const resolveProductOrderBy = (
  sortBy: InventorySortField,
  sortOrder: InventorySortOrder,
) => {
  switch (sortBy) {
    case "weightGrams":
      return { weightGrams: sortOrder };
    case "price":
      return { price: sortOrder };
    case "category":
      return { category: sortOrder };
    case "createdAt":
    default:
      return { createdAt: sortOrder };
  }
};

export const listProducts = async (
  organizationId: string,
  branchId?: string,
  options: InventoryListOptions = {},
): Promise<InventoryItem[]> => {
  await repairCompletedRunInventorySkus();

  const sortBy = options.sortBy ?? "createdAt";
  const sortOrder = options.sortOrder ?? "desc";

  const stockBranchId =
    branchId ?? (await getOrganizationHeadOfficeBranchId(organizationId));
  const marketRates = await getCurrentMarketRates(organizationId);

  const branchUnitStatuses = [
    InventoryUnitStatus.Available,
    InventoryUnitStatus.Reserved,
    InventoryUnitStatus.InTransit,
    InventoryUnitStatus.PendingVerification,
  ] as const;

  const branchUnitFilter = branchId
    ? {
        branchId,
        status: { in: [...branchUnitStatuses] },
      }
    : undefined;

  const branchInclude = branchId
    ? {
        branch: true,
        units: {
          where: branchUnitFilter,
          include: { branch: true, sale: true },
          orderBy: { createdAt: "asc" as const },
        },
        images: { orderBy: { sortOrder: "asc" as const } },
      }
    : productInclude;

  const products = await prisma.product.findMany({
    where: branchId
      ? {
          organizationId,
          units: { some: branchUnitFilter! },
        }
      : { branch: { organizationId } },
    include: branchInclude,
    orderBy: resolveProductOrderBy(sortBy, sortOrder),
  });

  const itemCodesNeedingTransferLocation = products.flatMap((product) =>
    product.units
      .filter(
        (unit) =>
          unit.status === InventoryUnitStatus.Transferred ||
          unit.status === InventoryUnitStatus.InTransit ||
          (unit.status === InventoryUnitStatus.Available &&
            stockBranchId &&
            unit.branchId !== stockBranchId),
      )
      .map((unit) => unit.itemCode),
  );
  const transferLocationByItemCode =
    itemCodesNeedingTransferLocation.length > 0
      ? await getLatestTransferLocationByItemCode(
          itemCodesNeedingTransferLocation,
        )
      : new Map<string, string>();

  let items = products
    .map((product) =>
      toInventoryItem(product, {
        stockBranchId,
        marketRates,
        transferLocationByItemCode,
      }),
    )
    .filter((item) => item.units.length > 0);

  if (sortBy === "price") {
    items = items.sort((a, b) =>
      sortOrder === "asc" ? a.price - b.price : b.price - a.price,
    );
  }

  return items;
};

export const createProduct = async (
  input: NewProductInput,
  branchId: string,
  actor?: AuditActor,
  options?: EntryProductOptions,
): Promise<InventoryItem> => {
  const category = input.category as ProductCategory;
  const organizationId = await getBranchOrganizationId(branchId);
  const marketRates = await getCurrentMarketRates(organizationId);
  const unitListPrice = computeLiveListPriceForProduct(
    {
      metal: input.metal,
      purity: input.purity,
      weightGrams: input.weightGrams,
      price: input.price,
    },
    marketRates,
  );

  const existing = await prisma.product.findMany({
    where: { organizationId },
    select: {
      sku: true,
      units: { select: { itemCode: true } },
    },
  });

  const existingSkus = existing.map((p) => p.sku);
  const existingUnitCodes = existing.flatMap((p) =>
    p.units.map((u) => u.itemCode),
  );

  const catalogNo = input.catalogNo?.trim().toUpperCase();
  const sku =
    catalogNo || generateSku(existingSkus, category, input.metal);

  if (catalogNo && existingSkus.includes(sku)) {
    throw new InventoryError(`Catalog number ${sku} already exists.`, 409);
  }

  let unitCodes: string[];
  if (input.itemCodes?.length) {
    if (input.itemCodes.length !== input.quantity) {
      throw new InventoryError(
        "Item code count must match quantity.",
        400,
      );
    }
    const normalized = input.itemCodes.map((code) => code.trim());
    const duplicates = normalized.filter(
      (code, i) => normalized.indexOf(code) !== i,
    );
    if (duplicates.length) {
      throw new InventoryError("Duplicate item codes in import.", 400);
    }
    const taken = normalized.filter((code) => existingUnitCodes.includes(code));
    if (taken.length) {
      throw new InventoryError(
        `Item code(s) already exist: ${taken.slice(0, 3).join(", ")}`,
        409,
      );
    }
    unitCodes = normalized;
  } else {
    unitCodes = generateUnitCodes(sku, input.quantity, existingUnitCodes);
  }

  const useEntryVerification = options?.entryVerification ?? false;

  const product = await prisma.$transaction(async (tx) => {
    let voucherId = options?.voucherId;
    if (useEntryVerification && !voucherId) {
      if (!actor) {
        throw new InventoryError("Actor is required for entry verification.", 400);
      }
      const voucher = await createEntryVoucherInTx(
        tx,
        organizationId,
        branchId,
        actor,
      );
      voucherId = voucher.id;
    }

    const unitStatus = useEntryVerification
      ? InventoryUnitStatus.PendingVerification
      : InventoryUnitStatus.Available;
    const initialStock = useEntryVerification ? 0 : input.quantity;
    const initialProductStatus = useEntryVerification
      ? ProductStockStatus.OutOfStock
      : getStockStatus(input.quantity);

    const created = await tx.product.create({
      data: {
        organizationId,
        branchId,
        sku,
        name: input.name.trim(),
        category: input.category,
        metal: input.metal,
        purity: input.purity,
        weightGrams: input.weightGrams,
        makingCharges: input.makingCharges,
        stoneCarat: input.stoneCarat,
        price: input.price,
        stock: initialStock,
        status: initialProductStatus,
        imageColor: CATEGORY_COLORS[category] ?? "#a1a1aa",
        units: {
          create: unitCodes.map((itemCode) => ({
            organizationId,
            branchId,
            itemCode,
            status: unitStatus,
            listPrice: unitListPrice,
            voucherId: voucherId ?? null,
          })),
        },
        images: {
          create: input.images.map((img, index) => ({
            url: img.url,
            name: img.name,
            sortOrder: index,
          })),
        },
      },
      include: productInclude,
    });

    const performer = actor ?? { name: "System" };
    await recordUnitsCreatedInTx(
      tx,
      created.units.map((unit) => ({
        unitId: unit.id,
        itemCode: unit.itemCode,
        productId: created.id,
      })),
      performer,
      useEntryVerification ? "pending_entry" : actor ? "manual_entry" : "system",
      {
        sku: created.sku,
        productName: created.name,
        voucherId,
      },
    );

    await syncProductStockInTx(tx, created.id);

    return created;
  });

  return toInventoryItem(product, { marketRates });
};

export const addQuantityToProduct = async (
  productId: string,
  quantity: number,
  actor?: AuditActor,
  options?: EntryProductOptions,
): Promise<InventoryItem | null> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });

  if (!product) return null;

  const marketRates = await getCurrentMarketRates(product.organizationId);
  const unitListPrice = computeLiveListPriceForProduct(product, marketRates);

  const orgUnits = await prisma.inventoryUnit.findMany({
    where: { organizationId: product.organizationId },
    select: { itemCode: true },
  });
  const existingUnitCodes = orgUnits.map((u) => u.itemCode);
  const newCodes = generateUnitCodes(product.sku, quantity, existingUnitCodes);

  const useEntryVerification = options?.entryVerification ?? false;

  const updated = await prisma.$transaction(async (tx) => {
    let voucherId = options?.voucherId;
    if (useEntryVerification && !voucherId) {
      if (!actor) {
        throw new InventoryError("Actor is required for entry verification.", 400);
      }
      const voucher = await createEntryVoucherInTx(
        tx,
        product.organizationId,
        product.branchId,
        actor,
      );
      voucherId = voucher.id;
    }

    const unitStatus = useEntryVerification
      ? InventoryUnitStatus.PendingVerification
      : InventoryUnitStatus.Available;

    await tx.inventoryUnit.createMany({
      data: newCodes.map((itemCode) => ({
        organizationId: product.organizationId,
        branchId: product.branchId,
        itemCode,
        productId: product.id,
        status: unitStatus,
        listPrice: unitListPrice,
        voucherId: voucherId ?? null,
      })),
    });

    const createdUnits = await tx.inventoryUnit.findMany({
      where: { productId: product.id, itemCode: { in: newCodes } },
      select: { id: true, itemCode: true },
    });

    const performer = actor ?? { name: "System" };
    await recordUnitsCreatedInTx(
      tx,
      createdUnits.map((unit) => ({
        unitId: unit.id,
        itemCode: unit.itemCode,
        productId: product.id,
      })),
      performer,
      useEntryVerification ? "pending_entry" : actor ? "add_units" : "system",
      { sku: product.sku, productName: product.name, voucherId },
    );

    await syncProductStockInTx(tx, productId);

    return tx.product.findUniqueOrThrow({
      where: { id: productId },
      include: productInclude,
    });
  });

  return toInventoryItem(updated, { marketRates });
};

export class InventoryError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "InventoryError";
  }
}

const EXTERNAL_TRANSFER_DOC_TYPES = ["Wholesale GST Invoice", "Delivery Challan"];
const INTERNAL_TRANSFER_DOC_TYPES = ["Delivery Challan", "Stock Transfer Note"];

type StockTransferWithRelations = DbStockTransfer & {
  fromBranch: Branch;
  toBranch: Branch;
  items: DbStockTransferItem[];
};

const toStockTransfer = toStockTransferDto;

const nextTransferNo = async (): Promise<string> => {
  const year = new Date().getFullYear().toString().slice(-2);
  const prefix = `TRF-${year}-`;
  const latest = await prisma.stockTransfer.findFirst({
    where: { transferNo: { startsWith: prefix } },
    orderBy: { transferNo: "desc" },
    select: { transferNo: true },
  });
  const lastNumber = latest
    ? Number(latest.transferNo.replace(prefix, "")) || 0
    : 0;
  return `${prefix}${String(lastNumber + 1).padStart(4, "0")}`;
};

export const listStockTransfers = async (
  organizationId: string,
): Promise<StockTransfer[]> => {
  const transfers = await prisma.stockTransfer.findMany({
    where: {
      OR: [
        { fromBranch: { organizationId } },
        { toBranch: { organizationId } },
      ],
    },
    include: {
      fromBranch: true,
      toBranch: true,
      customer: true,
      customerBranch: true,
      items: { orderBy: { itemCode: "asc" } },
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });
  return transfers.map(toStockTransfer);
};

export const transferInventoryUnits = async (
  productId: string,
  unitIds: string[],
  toBranchId: string,
  actor?: AuditActor,
): Promise<InventoryItem | null> => {
  if (unitIds.length === 0) {
    throw new InventoryError("Select at least one unit to transfer.");
  }

  const branch = await prisma.branch.findUnique({ where: { id: toBranchId } });
  if (!branch || !branch.active) {
    throw new InventoryError("Destination store is not active.", 404);
  }

  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });
  if (!product) return null;

  const units = await prisma.inventoryUnit.findMany({
    where: { id: { in: unitIds }, productId },
  });

  if (units.length !== unitIds.length) {
    throw new InventoryError("Some selected units were not found.", 404);
  }

  const blocked = units.find((unit) => unit.status !== InventoryUnitStatus.Available);
  if (blocked) {
    throw new InventoryError(
      `Cannot transfer ${blocked.itemCode} because it is ${blocked.status}.`,
    );
  }

  const performer = actor ?? { name: "System" };

  await prisma.$transaction(async (tx) => {
    await tx.inventoryUnit.updateMany({
      where: { id: { in: unitIds }, productId },
      data: { status: InventoryUnitStatus.InTransit },
    });

    for (const unit of units) {
      await recordUnitTransferOutInTx(
        tx,
        {
          unitId: unit.id,
          itemCode: unit.itemCode,
          productId: unit.productId,
          previousStatus: InventoryUnitStatus.Available,
          newStatus: InventoryUnitStatus.InTransit,
        },
        performer,
        { toBranchId, transferType: "branch_move" },
      );
    }

    await syncProductStockInTx(tx, productId, {
      performedByName: performer.name,
      performedById: performer.id,
      reason: "transfer_units",
    });
  });

  const updated = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });

  const marketRates = await getCurrentMarketRates();
  return updated ? toInventoryItem(updated, { marketRates }) : null;
};

export const createStockTransfer = async (
  input: CreateStockTransferInput,
  createdBy: { id: string; name: string },
  organizationId: string,
  sellingBranchId: string,
): Promise<{ transfer: StockTransfer; products: InventoryItem[] }> => {
  const isInternalTransfer = Boolean(input.internalBranchId?.trim());

  if (isInternalTransfer) {
    if (!INTERNAL_TRANSFER_DOC_TYPES.includes(input.documentType)) {
      throw new InventoryError("Select a valid transfer document type.");
    }
    if (input.customerId || input.customerBranchId) {
      throw new InventoryError(
        "Internal branch transfers cannot include customer details.",
        400,
      );
    }
  } else {
    if (!EXTERNAL_TRANSFER_DOC_TYPES.includes(input.documentType)) {
      throw new InventoryError("Select a valid transfer document type.");
    }
    if (!input.customerId?.trim() || !input.customerBranchId?.trim()) {
      throw new InventoryError("Select a customer and branch.");
    }
  }

  const transferDate = new Date(input.transferDate);
  if (Number.isNaN(transferDate.getTime())) {
    throw new InventoryError("Select a valid transfer date.");
  }

  const itemCodes = input.itemCodes;
  const cleanCodes = [...new Set(itemCodes.map((code) => code.trim()).filter(Boolean))];
  if (cleanCodes.length === 0) {
    throw new InventoryError("Scan at least one item to transfer.");
  }

  const headOfficeBranchId =
    await getOrganizationHeadOfficeBranchId(organizationId);

  let toBranchId: string;
  let customerId: string | null = null;
  let customerBranchId: string | null = null;

  if (isInternalTransfer) {
    const internalBranchId = input.internalBranchId!.trim();
    const destBranch = await prisma.branch.findFirst({
      where: { id: internalBranchId, organizationId, active: true },
    });
    if (!destBranch) {
      throw new InventoryError("Destination branch not found.", 404);
    }
    if (internalBranchId === headOfficeBranchId) {
      throw new InventoryError("Cannot transfer stock to the same branch.", 400);
    }
    toBranchId = internalBranchId;
  } else {
    let customerBranch: Awaited<
      ReturnType<typeof resolveCustomerBranchForTransfer>
    >["customerBranch"];
    try {
      ({ customerBranch } = await resolveCustomerBranchForTransfer(
        input.customerId!,
        input.customerBranchId!,
        organizationId,
      ));
    } catch (error) {
      if (error instanceof CustomerError) {
        throw new InventoryError(error.message, error.statusCode);
      }
      throw error;
    }

    customerId = input.customerId!;
    customerBranchId = input.customerBranchId!;

    const linkedInternalBranchId = customerBranch.branchId ?? null;
    if (linkedInternalBranchId) {
      const linkedBranch = await prisma.branch.findFirst({
        where: { id: linkedInternalBranchId, organizationId, active: true },
      });
      toBranchId = linkedBranch ? linkedInternalBranchId : headOfficeBranchId;
    } else {
      toBranchId = headOfficeBranchId;
    }
  }

  const units = await prisma.inventoryUnit.findMany({
    where: { organizationId, itemCode: { in: cleanCodes } },
    include: { product: true },
  });

  if (units.length !== cleanCodes.length) {
    const found = new Set(units.map((unit) => unit.itemCode));
    const missing = cleanCodes.find((code) => !found.has(code));
    throw new InventoryError(`Item code not found: ${missing}`, 404);
  }

  const blocked = units.find((unit) => unit.status !== InventoryUnitStatus.Available);
  if (blocked) {
    throw new InventoryError(
      `Cannot transfer ${blocked.itemCode} because it is ${blocked.status}.`,
    );
  }

  const notInAdminStock = units.find(
    (unit) => unit.branchId !== headOfficeBranchId,
  );
  if (notInAdminStock) {
    throw new InventoryError(
      `${notInAdminStock.itemCode} is not available in admin stock.`,
      400,
    );
  }

  const transferNo = await nextTransferNo();
  const marketRates = await getCurrentMarketRates();
  const totalValue = moneyToNumber(
    sumMoney(
      units.map((unit) =>
        computeLiveListPriceForProduct(unit.product, marketRates),
      ),
    ),
  );

  const customer = customerId
    ? await prisma.customer.findUnique({
        where: { id: customerId },
        select: { name: true, mobile: true },
      })
    : null;

  const isWholesaleInvoice = input.documentType === "Wholesale GST Invoice";
  const unitStatus = isInternalTransfer
    ? InventoryUnitStatus.InTransit
    : isWholesaleInvoice
      ? InventoryUnitStatus.Sold
      : InventoryUnitStatus.Transferred;

  const transferStatus = isInternalTransfer
    ? StockTransferStatus.Pending
    : StockTransferStatus.Accepted;

  const transfer = await prisma.$transaction(async (tx) => {
    const created = await tx.stockTransfer.create({
      data: {
        transferNo,
        fromBranchId: headOfficeBranchId,
        toBranchId,
        customerId,
        customerBranchId,
        documentType: input.documentType,
        transferDate,
        itemCount: units.length,
        totalValue,
        status: transferStatus,
        ...(isInternalTransfer
          ? {}
          : {
              acceptedById: createdBy.id,
              acceptedByName: createdBy.name,
              acceptedAt: new Date(),
            }),
        createdById: createdBy.id,
        createdByName: createdBy.name,
        notes: input.notes?.trim() || null,
        recipientGstNumber: input.billing?.recipientGstNumber?.trim() || null,
        recipientGstRegisteredName:
          input.billing?.recipientGstRegisteredName?.trim() || null,
        recipientPanNumber: input.billing?.recipientPanNumber?.trim() || null,
        recipientEmail: input.billing?.recipientEmail?.trim() || null,
        recipientPhone: input.billing?.recipientPhone?.trim() || null,
        recipientAddress: input.billing?.recipientAddress?.trim() || null,
        placeOfSupplyState: input.billing?.placeOfSupplyState?.trim() || null,
        placeOfSupplyStateCode:
          input.billing?.placeOfSupplyStateCode?.trim() || null,
        placeOfDeliveryState:
          input.billing?.placeOfDeliveryState?.trim() || null,
        placeOfDeliveryStateCode:
          input.billing?.placeOfDeliveryStateCode?.trim() || null,
        items: {
          create: units.map((unit) => ({
            itemCode: unit.itemCode,
            productId: unit.productId,
            productName: unit.product.name,
            sku: unit.product.sku,
            metal: unit.product.metal,
            purity: unit.product.purity,
            price: computeLiveListPriceForProduct(unit.product, marketRates),
            weightGrams: unit.product.weightGrams,
            accepted: !isInternalTransfer,
          })),
        },
      },
    });

    const unitUpdateData: {
      status: InventoryUnitStatus;
      branchId?: string;
    } = { status: unitStatus };

    if (!isInternalTransfer && toBranchId !== headOfficeBranchId) {
      unitUpdateData.branchId = toBranchId;
    }

    await tx.inventoryUnit.updateMany({
      where: { itemCode: { in: cleanCodes } },
      data: unitUpdateData,
    });

    for (const unit of units) {
      await recordUnitTransferOutInTx(
        tx,
        {
          unitId: unit.id,
          itemCode: unit.itemCode,
          productId: unit.productId,
          previousStatus: InventoryUnitStatus.Available,
          newStatus: unitStatus,
        },
        createdBy,
        {
          transferNo,
          transferId: created.id,
          documentType: input.documentType,
          ...(customerId ? { customerId, customerBranchId: customerBranchId! } : {}),
          ...(isInternalTransfer ? { toBranchId, transferType: "branch_move" } : {}),
        },
      );

      await syncProductStockInTx(tx, unit.productId, {
        performedById: createdBy.id,
        performedByName: createdBy.name,
        reason: isWholesaleInvoice
          ? "wholesale_transfer_sale"
          : isInternalTransfer
            ? "transfer_create_internal"
            : "transfer_create",
        unitId: unit.id,
        itemCode: unit.itemCode,
        previousUnitStatus: InventoryUnitStatus.Available,
        newUnitStatus: unitStatus,
      });
    }

    if (isWholesaleInvoice) {
      for (const unit of units) {
        const listPrice = computeLiveListPriceForProduct(unit.product, marketRates);
        await tx.sale.create({
          data: {
            branchId: sellingBranchId,
            unitId: unit.id,
            itemCode: unit.itemCode,
            productId: unit.productId,
            productName: unit.product.name,
            sku: unit.product.sku,
            category: unit.product.category,
            listPrice,
            discount: 0,
            dealPrice: listPrice,
            paymentMode: "Transfer",
            paymentStatus: SalePaymentStatus.Completed,
            customerPhone: customer?.mobile ?? "",
            customerName: customer?.name,
            customerId: customerId!,
            soldAt: transferDate,
            saleSource: "WholesaleTransfer",
            stockTransferId: created.id,
          },
        });
      }
    }

    return tx.stockTransfer.findUniqueOrThrow({
      where: { id: created.id },
      include: {
        fromBranch: true,
        toBranch: true,
        customer: true,
        customerBranch: true,
        items: { orderBy: { itemCode: "asc" } },
      },
    });
  });

  const productIds = [...new Set(units.map((unit) => unit.productId))];
  const updatedProducts = await prisma.product.findMany({
    where: { id: { in: productIds } },
    include: productInclude,
    orderBy: { createdAt: "desc" },
  });

  return {
    transfer: toStockTransfer(transfer),
    products: updatedProducts.map((product) =>
      toInventoryItem(product, {
        stockBranchId: headOfficeBranchId,
        marketRates,
      }),
    ),
  };
};

export const updateProduct = async (
  productId: string,
  input: UpdateProductInput,
): Promise<InventoryItem | null> => {
  const existing = await prisma.product.findUnique({
    where: { id: productId },
    include: productInclude,
  });
  if (!existing) return null;

  const category = (input.category ?? existing.category) as ProductCategory;

  const updated = await prisma.$transaction(async (tx) => {
    if (input.images) {
      await tx.productImage.deleteMany({ where: { productId } });
      if (input.images.length > 0) {
        await tx.productImage.createMany({
          data: input.images.map((img, index) => ({
            productId,
            url: img.url,
            name: img.name,
            sortOrder: index,
          })),
        });
      }
    }

    return tx.product.update({
      where: { id: productId },
      data: {
        ...(input.name !== undefined && { name: input.name.trim() }),
        ...(input.category !== undefined && { category: input.category }),
        ...(input.metal !== undefined && { metal: input.metal }),
        ...(input.purity !== undefined && { purity: input.purity }),
        ...(input.weightGrams !== undefined && {
          weightGrams: input.weightGrams,
        }),
        ...(input.makingCharges !== undefined && {
          makingCharges: input.makingCharges,
        }),
        ...(input.stoneCarat !== undefined && {
          stoneCarat: input.stoneCarat,
        }),
        ...(input.price !== undefined && { price: input.price }),
        ...(input.category !== undefined && {
          imageColor: CATEGORY_COLORS[category] ?? existing.imageColor,
        }),
      },
      include: productInclude,
    });
  });

  return toInventoryItem(updated, { marketRates: await getCurrentMarketRates() });
};

export const deleteProduct = async (productId: string): Promise<boolean> => {
  const product = await prisma.product.findUnique({
    where: { id: productId },
    include: { units: true },
  });
  if (!product) return false;

  if (product.units.length > 0) {
    throw new InventoryError(
      "Confirmed inventory cannot be deleted. Only a manual database change can remove stock.",
      403,
    );
  }

  await prisma.product.delete({ where: { id: productId } });
  return true;
};

export const deleteInventoryUnit = async (
  _unitId: string,
): Promise<InventoryItem | null> => {
  throw new InventoryError(
    "Confirmed inventory units cannot be deleted. Only a manual database change can remove stock.",
    403,
  );
};

export const repairInventory = async (actor?: {
  id: string;
  name: string;
}) => {
  const reconcileReport = await reconcileInventoryWithSales();
  const wholesaleReport = await backfillMissingWholesaleSales();
  const transferredBranchReport = await backfillTransferredUnitBranches();
  const report = {
    ...reconcileReport,
    wholesaleSalesCreated: wholesaleReport.salesCreated,
    wholesaleSalesSkipped: wholesaleReport.skipped,
    transferredUnitsBranchUpdated: transferredBranchReport.updated,
    transferredUnitsScanned: transferredBranchReport.scanned,
  };
  await recordInventoryAudit({
    entityType: "Product",
    entityId: "all",
    action: "Reconciliation",
    newValue: report,
    reason: "admin_repair",
    performedById: actor?.id,
    performedByName: actor?.name ?? "System",
  });
  return report;
};
