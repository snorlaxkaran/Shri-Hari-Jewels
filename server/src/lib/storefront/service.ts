import { InventoryUnitStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { getOrganizationHeadOfficeBranchId } from "../branches/access.js";
import { syncProductStockInTx } from "../inventory/stock-sync.js";
import {
  isHallmarked,
  requiresHallmark,
} from "../hallmark/requires-hallmark.js";
import { moneyToNumber, multiplyMoney, sumMoney, toMoney } from "../money.js";
import { generateOrderNo } from "../orders/order-no.js";
import {
  requireActiveStorefront,
  resolveTenantBySlug,
  StorefrontError,
} from "./resolve-tenant.js";
import {
  toStorefrontCollection,
  toStorefrontConfig,
  toStorefrontProduct,
  toWebOrderDto,
  type StorefrontCollectionDto,
  type StorefrontConfigDto,
  type StorefrontProductDto,
  type WebOrderDto,
} from "./mappers.js";
import { generateWebOrderNo } from "./web-order-no.js";

const productInclude = {
  images: { orderBy: { sortOrder: "asc" as const } },
};

const countAvailableUnits = async (
  product: { id: string; metal: string; weightGrams: number },
  organizationId: string,
): Promise<number> => {
  const units = await prisma.inventoryUnit.findMany({
    where: {
      productId: product.id,
      organizationId,
      status: InventoryUnitStatus.Available,
    },
    select: { huid: true, hallmarkNumber: true },
  });

  if (!requiresHallmark(product)) {
    return units.length;
  }

  return units.filter((unit) => isHallmarked(unit)).length;
};

export const getStorefrontConfig = async (
  organizationId: string,
): Promise<StorefrontConfigDto> => {
  await requireActiveStorefront(organizationId);

  const [org, settings, shop] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { slug: true, active: true },
    }),
    prisma.storefrontSettings.findUniqueOrThrow({
      where: { organizationId },
    }),
    prisma.shopSettings.findUnique({ where: { organizationId } }),
  ]);

  if (!org.active) {
    throw new StorefrontError("This store is not available.", 404);
  }

  return toStorefrontConfig(org.slug, settings, shop);
};

export type StorefrontProductFilters = {
  category?: string;
  metal?: string;
  search?: string;
  collection?: string;
  sortBy?: "price" | "name" | "newest";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export const listStorefrontProducts = async (
  organizationId: string,
  filters: StorefrontProductFilters = {},
): Promise<{ products: StorefrontProductDto[]; total: number }> => {
  await requireActiveStorefront(organizationId);

  const page = Math.max(1, filters.page ?? 1);
  const limit = Math.min(50, Math.max(1, filters.limit ?? 24));
  const skip = (page - 1) * limit;

  const where = {
    organizationId,
    publishedToStorefront: true,
    ...(filters.category && { category: filters.category }),
    ...(filters.metal && { metal: filters.metal }),
    ...(filters.search && {
      OR: [
        { name: { contains: filters.search, mode: "insensitive" as const } },
        { sku: { contains: filters.search, mode: "insensitive" as const } },
        { category: { contains: filters.search, mode: "insensitive" as const } },
      ],
    }),
    ...(filters.collection && {
      collectionLinks: {
        some: {
          collection: {
            slug: filters.collection,
            active: true,
          },
        },
      },
    }),
  };

  const sortBy = filters.sortBy ?? "newest";
  const sortOrder = filters.sortOrder ?? "desc";
  const orderBy =
    sortBy === "price"
      ? { price: sortOrder }
      : sortBy === "name"
        ? { name: sortOrder }
        : { createdAt: sortOrder };

  const [products, total] = await Promise.all([
    prisma.product.findMany({
      where,
      include: productInclude,
      orderBy,
      skip,
      take: limit,
    }),
    prisma.product.count({ where }),
  ]);

  const stockCounts = await Promise.all(
    products.map((p) => countAvailableUnits(p, organizationId)),
  );

  return {
    products: products.map((p, i) => toStorefrontProduct(p, stockCounts[i])),
    total,
  };
};

export const getStorefrontProduct = async (
  organizationId: string,
  productIdOrSku: string,
): Promise<StorefrontProductDto> => {
  await requireActiveStorefront(organizationId);

  const product = await prisma.product.findFirst({
    where: {
      organizationId,
      publishedToStorefront: true,
      OR: [{ id: productIdOrSku }, { sku: productIdOrSku }],
    },
    include: productInclude,
  });

  if (!product) {
    throw new StorefrontError("Product not found.", 404);
  }

  const stock = await countAvailableUnits(product, organizationId);
  return toStorefrontProduct(product, stock);
};

export const listStorefrontCollections = async (
  organizationId: string,
  includeProducts = false,
): Promise<StorefrontCollectionDto[]> => {
  await requireActiveStorefront(organizationId);

  const collections = await prisma.storefrontCollection.findMany({
    where: { organizationId, active: true },
    include: {
      products: {
        where: {
          product: { publishedToStorefront: true },
        },
        include: {
          product: { include: productInclude },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return collections.map((c) => toStorefrontCollection(c, includeProducts));
};

export const getStorefrontCollection = async (
  organizationId: string,
  slug: string,
): Promise<StorefrontCollectionDto> => {
  await requireActiveStorefront(organizationId);

  const collection = await prisma.storefrontCollection.findFirst({
    where: { organizationId, slug, active: true },
    include: {
      products: {
        where: {
          product: { publishedToStorefront: true },
        },
        include: {
          product: { include: productInclude },
        },
        orderBy: { sortOrder: "asc" },
      },
    },
  });

  if (!collection) {
    throw new StorefrontError("Collection not found.", 404);
  }

  return toStorefrontCollection(collection, true);
};

export const getStorefrontCategories = async (
  organizationId: string,
): Promise<string[]> => {
  await requireActiveStorefront(organizationId);

  const rows = await prisma.product.findMany({
    where: { organizationId, publishedToStorefront: true },
    select: { category: true },
    distinct: ["category"],
    orderBy: { category: "asc" },
  });

  return rows.map((r) => r.category);
};

export type CheckoutItemInput = {
  productId: string;
  quantity: number;
};

export type CheckoutInput = {
  customerName: string;
  customerEmail?: string;
  customerMobile: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
  notes?: string;
  items: CheckoutItemInput[];
};

export const placeWebOrder = async (
  organizationId: string,
  input: CheckoutInput,
): Promise<WebOrderDto> => {
  await requireActiveStorefront(organizationId);

  const name = input.customerName.trim();
  const mobile = input.customerMobile.trim().replace(/\s+/g, "");
  const email = input.customerEmail?.trim() || null;

  if (!name) throw new StorefrontError("Customer name is required.");
  if (!/^\d{10}$/.test(mobile)) {
    throw new StorefrontError("Mobile number must be 10 digits.");
  }
  if (!input.addressLine1?.trim()) {
    throw new StorefrontError("Address is required.");
  }
  if (!input.city?.trim() || !input.state?.trim() || !input.pincode?.trim()) {
    throw new StorefrontError("City, state, and pincode are required.");
  }
  if (!input.items?.length) {
    throw new StorefrontError("Cart is empty.");
  }

  const branchId = await getOrganizationHeadOfficeBranchId(organizationId);

  const productIds = input.items.map((i) => i.productId);
  const products = await prisma.product.findMany({
    where: {
      organizationId,
      id: { in: productIds },
      publishedToStorefront: true,
    },
    include: productInclude,
  });

  if (products.length !== new Set(productIds).size) {
    throw new StorefrontError("One or more products are unavailable.");
  }

  const productMap = new Map(products.map((p) => [p.id, p]));
  const lineItems: Array<{
    productId: string;
    productSku: string;
    productName: string;
    quantity: number;
    unitPrice: ReturnType<typeof toMoney>;
    lineTotal: ReturnType<typeof toMoney>;
    reservedUnitIds: string[];
  }> = [];

  for (const item of input.items) {
    const qty = Math.max(1, Math.floor(item.quantity));
    const product = productMap.get(item.productId);
    if (!product) {
      throw new StorefrontError("Product not found.", 404);
    }

    const available = await countAvailableUnits(product, organizationId);
    if (available < qty) {
      throw new StorefrontError(
        `"${product.name}" has only ${available} unit(s) available.`,
      );
    }

    const unitPrice = toMoney(product.price);
    lineItems.push({
      productId: product.id,
      productSku: product.sku,
      productName: product.name,
      quantity: qty,
      unitPrice,
      lineTotal: multiplyMoney(unitPrice, qty),
      reservedUnitIds: [],
    });
  }

  const totalAmount = sumMoney(lineItems.map((l) => l.lineTotal));

  const order = await prisma.$transaction(async (tx) => {
    let customer = await tx.customer.findUnique({
      where: {
        organizationId_mobile: { organizationId, mobile },
      },
    });

    if (!customer) {
      customer = await tx.customer.create({
        data: {
          organizationId,
          name,
          mobile,
          email,
          customerType: "Individual Buyer",
          billingAddressLine1: input.addressLine1.trim(),
          billingAddressLine2: input.addressLine2?.trim() || null,
          billingCity: input.city.trim(),
          billingState: input.state.trim(),
          billingPincode: input.pincode.trim(),
          billingCountry: input.country?.trim() || "India",
        },
      });
    } else if (email && !customer.email) {
      customer = await tx.customer.update({
        where: { id: customer.id },
        data: { email, name },
      });
    }

    const existingWebOrders = await tx.webOrder.findMany({
      where: { organizationId },
      select: { orderNo: true },
    });
    const orderNo = generateWebOrderNo(existingWebOrders.map((o) => o.orderNo));

    for (const line of lineItems) {
      const product = productMap.get(line.productId)!;
      const allUnits = await tx.inventoryUnit.findMany({
        where: {
          productId: line.productId,
          organizationId,
          status: InventoryUnitStatus.Available,
        },
        orderBy: { createdAt: "asc" },
      });

      const units = (
        requiresHallmark(product)
          ? allUnits.filter((unit) => isHallmarked(unit))
          : allUnits
      ).slice(0, line.quantity);

      if (units.length < line.quantity) {
        throw new StorefrontError(
          `Insufficient stock for "${line.productName}".`,
        );
      }

      line.reservedUnitIds = units.map((u) => u.id);

      await tx.inventoryUnit.updateMany({
        where: { id: { in: line.reservedUnitIds } },
        data: { status: InventoryUnitStatus.Reserved },
      });

      await syncProductStockInTx(tx, line.productId, {
        reason: `Web order ${orderNo} reserved ${units.length} unit(s)`,
        performedByName: "Online Store",
        newUnitStatus: InventoryUnitStatus.Reserved,
      });
    }

    const webOrder = await tx.webOrder.create({
      data: {
        organizationId,
        branchId,
        orderNo,
        customerId: customer.id,
        customerName: name,
        customerEmail: email,
        customerMobile: mobile,
        addressLine1: input.addressLine1.trim(),
        addressLine2: input.addressLine2?.trim() || null,
        city: input.city.trim(),
        state: input.state.trim(),
        pincode: input.pincode.trim(),
        country: input.country?.trim() || "India",
        totalAmount,
        notes: input.notes?.trim() || null,
        items: {
          create: lineItems.map((l) => ({
            productId: l.productId,
            productSku: l.productSku,
            productName: l.productName,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            lineTotal: l.lineTotal,
            reservedUnitIds: l.reservedUnitIds,
          })),
        },
      },
      include: { items: true },
    });

    const existingOrders = await tx.order.findMany({
      where: { branchId },
      select: { orderNo: true },
    });
    const erpOrderNo = generateOrderNo(existingOrders.map((o) => o.orderNo));
    const itemSummary = lineItems
      .map((l) => `${l.productName} x${l.quantity}`)
      .join(", ");

    const erpOrder = await tx.order.create({
      data: {
        branchId,
        orderNo: erpOrderNo,
        customerId: customer.id,
        description: `Web order ${orderNo}: ${itemSummary}`,
        estimatedTotal: totalAmount,
        notes: input.notes?.trim() || `Placed via online store (${orderNo})`,
      },
    });

    await tx.webOrder.update({
      where: { id: webOrder.id },
      data: { erpOrderId: erpOrder.id },
    });

    return tx.webOrder.findUniqueOrThrow({
      where: { id: webOrder.id },
      include: { items: true },
    });
  });

  return toWebOrderDto(order);
};

export const getWebOrderByNo = async (
  organizationId: string,
  orderNo: string,
): Promise<WebOrderDto> => {
  await requireActiveStorefront(organizationId);

  const order = await prisma.webOrder.findFirst({
    where: { organizationId, orderNo },
    include: { items: true },
  });

  if (!order) {
    throw new StorefrontError("Order not found.", 404);
  }

  return toWebOrderDto(order);
};

export const getStorefrontStatus = async (
  slug: string,
): Promise<{
  exists: boolean;
  active: boolean;
  enabled: boolean;
  businessName: string | null;
  slug: string;
}> => {
  const tenant = await resolveTenantBySlug(slug);
  if (!tenant) {
    return {
      exists: false,
      active: false,
      enabled: false,
      businessName: null,
      slug,
    };
  }

  const [settings, shop] = await Promise.all([
    prisma.storefrontSettings.findUnique({
      where: { organizationId: tenant.organizationId },
    }),
    prisma.shopSettings.findUnique({
      where: { organizationId: tenant.organizationId },
    }),
  ]);

  return {
    exists: true,
    active: tenant.active,
    enabled: settings?.enabled ?? false,
    businessName: shop?.businessName ?? tenant.name,
    slug: tenant.slug,
  };
};

export const previewStorefrontConfig = async (
  organizationId: string,
): Promise<StorefrontConfigDto | null> => {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { slug: true, active: true },
  });
  if (!org?.active) return null;

  const settings = await prisma.storefrontSettings.findUnique({
    where: { organizationId },
  });
  if (!settings) return null;

  const shop = await prisma.shopSettings.findUnique({ where: { organizationId } });
  return toStorefrontConfig(org.slug, settings, shop);
};

export const formatProductPrice = (price: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);

export { moneyToNumber };
