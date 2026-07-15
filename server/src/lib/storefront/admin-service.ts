import { InventoryUnitStatus } from "@prisma/client";
import { prisma } from "../db.js";
import { syncProductStockInTx } from "../inventory/stock-sync.js";
import { getOrganizationHeadOfficeBranchId } from "../branches/access.js";
import {
  toStorefrontCollection,
  toStorefrontConfig,
  toStorefrontProduct,
  toWebOrderDto,
  type StorefrontCollectionDto,
  type StorefrontConfigDto,
  type WebOrderDto,
} from "./mappers.js";
import { StorefrontError } from "./resolve-tenant.js";

export type UpdateStorefrontSettingsInput = {
  enabled?: boolean;
  tagline?: string | null;
  heroTitle?: string | null;
  heroSubtitle?: string | null;
  aboutText?: string | null;
  primaryColor?: string;
  accentColor?: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  instagramUrl?: string | null;
  facebookUrl?: string | null;
  whatsappNumber?: string | null;
  shippingNote?: string | null;
  returnPolicy?: string | null;
};

export type CreateCollectionInput = {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  active?: boolean;
};

export type UpdateCollectionInput = Partial<CreateCollectionInput>;

const slugify = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const getAdminStorefrontSettings = async (
  organizationId: string,
): Promise<StorefrontConfigDto & { customDomain: string | null; storeUrl: string }> => {
  const [org, settings, shop] = await Promise.all([
    prisma.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { slug: true, customDomain: true },
    }),
    prisma.storefrontSettings.findUnique({
      where: { organizationId },
    }),
    prisma.shopSettings.findUnique({ where: { organizationId } }),
  ]);

  if (!settings) {
    throw new StorefrontError("Storefront settings not found.", 404);
  }

  const base = toStorefrontConfig(org.slug, settings, shop);
  const clientUrl = process.env.CLIENT_URL?.split(",")[0]?.trim() ?? "http://localhost:3000";

  return {
    ...base,
    customDomain: org.customDomain,
    storeUrl: `${clientUrl}/shop/${org.slug}`,
  };
};

export const updateAdminStorefrontSettings = async (
  organizationId: string,
  input: UpdateStorefrontSettingsInput,
): Promise<StorefrontConfigDto & { customDomain: string | null; storeUrl: string }> => {
  await prisma.storefrontSettings.upsert({
    where: { organizationId },
    create: {
      organizationId,
      enabled: input.enabled ?? false,
      tagline: input.tagline ?? null,
      heroTitle: input.heroTitle ?? null,
      heroSubtitle: input.heroSubtitle ?? null,
      aboutText: input.aboutText ?? null,
      primaryColor: input.primaryColor ?? "#b8860b",
      accentColor: input.accentColor ?? "#1a1a1a",
      logoUrl: input.logoUrl ?? null,
      bannerUrl: input.bannerUrl ?? null,
      contactEmail: input.contactEmail ?? null,
      contactPhone: input.contactPhone ?? null,
      instagramUrl: input.instagramUrl ?? null,
      facebookUrl: input.facebookUrl ?? null,
      whatsappNumber: input.whatsappNumber ?? null,
      shippingNote: input.shippingNote ?? null,
      returnPolicy: input.returnPolicy ?? null,
    },
    update: {
      ...(input.enabled !== undefined && { enabled: input.enabled }),
      ...(input.tagline !== undefined && { tagline: input.tagline }),
      ...(input.heroTitle !== undefined && { heroTitle: input.heroTitle }),
      ...(input.heroSubtitle !== undefined && { heroSubtitle: input.heroSubtitle }),
      ...(input.aboutText !== undefined && { aboutText: input.aboutText }),
      ...(input.primaryColor !== undefined && { primaryColor: input.primaryColor }),
      ...(input.accentColor !== undefined && { accentColor: input.accentColor }),
      ...(input.logoUrl !== undefined && { logoUrl: input.logoUrl }),
      ...(input.bannerUrl !== undefined && { bannerUrl: input.bannerUrl }),
      ...(input.contactEmail !== undefined && { contactEmail: input.contactEmail }),
      ...(input.contactPhone !== undefined && { contactPhone: input.contactPhone }),
      ...(input.instagramUrl !== undefined && { instagramUrl: input.instagramUrl }),
      ...(input.facebookUrl !== undefined && { facebookUrl: input.facebookUrl }),
      ...(input.whatsappNumber !== undefined && { whatsappNumber: input.whatsappNumber }),
      ...(input.shippingNote !== undefined && { shippingNote: input.shippingNote }),
      ...(input.returnPolicy !== undefined && { returnPolicy: input.returnPolicy }),
    },
  });

  return getAdminStorefrontSettings(organizationId);
};

export const updateCustomDomain = async (
  organizationId: string,
  customDomain: string | null,
): Promise<void> => {
  const normalized = customDomain?.trim().toLowerCase() || null;

  if (normalized) {
    const conflict = await prisma.organization.findFirst({
      where: { customDomain: normalized, NOT: { id: organizationId } },
    });
    if (conflict) {
      throw new StorefrontError("This custom domain is already in use.");
    }
  }

  await prisma.organization.update({
    where: { id: organizationId },
    data: { customDomain: normalized },
  });
};

export type PublishableProduct = {
  id: string;
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  publishedToStorefront: boolean;
  storefrontDescription: string | null;
  imageUrl: string | null;
};

export const listPublishableProducts = async (
  organizationId: string,
): Promise<PublishableProduct[]> => {
  const products = await prisma.product.findMany({
    where: { organizationId },
    include: {
      images: { orderBy: { sortOrder: "asc" }, take: 1 },
      units: {
        where: { status: "Available" },
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return products.map((p) => ({
    id: p.id,
    sku: p.sku,
    name: p.name,
    category: p.category,
    price: Number(p.price),
    stock: p.units.length,
    publishedToStorefront: p.publishedToStorefront,
    storefrontDescription: p.storefrontDescription,
    imageUrl: p.images[0]?.url ?? null,
  }));
};

export const setProductPublished = async (
  organizationId: string,
  productId: string,
  published: boolean,
  storefrontDescription?: string | null,
): Promise<void> => {
  const product = await prisma.product.findFirst({
    where: { id: productId, organizationId },
  });
  if (!product) throw new StorefrontError("Product not found.", 404);

  await prisma.product.update({
    where: { id: productId },
    data: {
      publishedToStorefront: published,
      ...(storefrontDescription !== undefined && {
        storefrontDescription,
      }),
    },
  });
};

export const bulkSetProductsPublished = async (
  organizationId: string,
  productIds: string[],
  published: boolean,
): Promise<number> => {
  const result = await prisma.product.updateMany({
    where: { organizationId, id: { in: productIds } },
    data: { publishedToStorefront: published },
  });
  return result.count;
};

export const listAdminCollections = async (
  organizationId: string,
): Promise<StorefrontCollectionDto[]> => {
  const collections = await prisma.storefrontCollection.findMany({
    where: { organizationId },
    include: {
      products: {
        include: { product: { include: { images: true } } },
        orderBy: { sortOrder: "asc" },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return collections.map((c) => toStorefrontCollection(c, false));
};

export const createCollection = async (
  organizationId: string,
  input: CreateCollectionInput,
): Promise<StorefrontCollectionDto> => {
  const name = input.name.trim();
  if (!name) throw new StorefrontError("Collection name is required.");

  const slug = slugify(input.slug || name);
  if (!slug) throw new StorefrontError("Collection slug is required.");

  const existing = await prisma.storefrontCollection.findUnique({
    where: { organizationId_slug: { organizationId, slug } },
  });
  if (existing) throw new StorefrontError("Collection slug already exists.");

  const collection = await prisma.storefrontCollection.create({
    data: {
      organizationId,
      name,
      slug,
      description: input.description?.trim() || null,
      imageUrl: input.imageUrl?.trim() || null,
      sortOrder: input.sortOrder ?? 0,
      active: input.active ?? true,
    },
    include: { products: { include: { product: { include: { images: true } } } } },
  });

  return toStorefrontCollection(collection, false);
};

export const updateCollection = async (
  organizationId: string,
  collectionId: string,
  input: UpdateCollectionInput,
): Promise<StorefrontCollectionDto> => {
  const existing = await prisma.storefrontCollection.findFirst({
    where: { id: collectionId, organizationId },
  });
  if (!existing) throw new StorefrontError("Collection not found.", 404);

  let slug = existing.slug;
  if (input.slug !== undefined || input.name !== undefined) {
    slug = slugify(input.slug || input.name || existing.name);
    const conflict = await prisma.storefrontCollection.findFirst({
      where: { organizationId, slug, NOT: { id: collectionId } },
    });
    if (conflict) throw new StorefrontError("Collection slug already exists.");
  }

  const collection = await prisma.storefrontCollection.update({
    where: { id: collectionId },
    data: {
      ...(input.name !== undefined && { name: input.name.trim() }),
      ...(input.slug !== undefined || input.name !== undefined ? { slug } : {}),
      ...(input.description !== undefined && {
        description: input.description?.trim() || null,
      }),
      ...(input.imageUrl !== undefined && {
        imageUrl: input.imageUrl?.trim() || null,
      }),
      ...(input.sortOrder !== undefined && { sortOrder: input.sortOrder }),
      ...(input.active !== undefined && { active: input.active }),
    },
    include: { products: { include: { product: { include: { images: true } } } } },
  });

  return toStorefrontCollection(collection, false);
};

export const deleteCollection = async (
  organizationId: string,
  collectionId: string,
): Promise<void> => {
  const existing = await prisma.storefrontCollection.findFirst({
    where: { id: collectionId, organizationId },
  });
  if (!existing) throw new StorefrontError("Collection not found.", 404);

  await prisma.storefrontCollection.delete({ where: { id: collectionId } });
};

export const setCollectionProducts = async (
  organizationId: string,
  collectionId: string,
  productIds: string[],
): Promise<StorefrontCollectionDto> => {
  const collection = await prisma.storefrontCollection.findFirst({
    where: { id: collectionId, organizationId },
  });
  if (!collection) throw new StorefrontError("Collection not found.", 404);

  const validProducts = await prisma.product.findMany({
    where: { organizationId, id: { in: productIds } },
    select: { id: true },
  });
  const validIds = new Set(validProducts.map((p) => p.id));

  await prisma.$transaction(async (tx) => {
    await tx.storefrontCollectionProduct.deleteMany({
      where: { collectionId },
    });

    if (validIds.size > 0) {
      await tx.storefrontCollectionProduct.createMany({
        data: [...validIds].map((productId, index) => ({
          collectionId,
          productId,
          sortOrder: index,
        })),
      });
    }
  });

  const updated = await prisma.storefrontCollection.findUniqueOrThrow({
    where: { id: collectionId },
    include: { products: { include: { product: { include: { images: true } } } } },
  });

  return toStorefrontCollection(updated, false);
};

export const listWebOrders = async (
  organizationId: string,
): Promise<WebOrderDto[]> => {
  const orders = await prisma.webOrder.findMany({
    where: { organizationId },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return orders.map(toWebOrderDto);
};

export type UpdateWebOrderInput = {
  status?: "Pending" | "Confirmed" | "Processing" | "Shipped" | "Delivered" | "Cancelled";
  paymentStatus?: "Unpaid" | "Paid" | "Refunded";
};

export const updateWebOrder = async (
  organizationId: string,
  orderId: string,
  input: UpdateWebOrderInput,
): Promise<WebOrderDto> => {
  const existing = await prisma.webOrder.findFirst({
    where: { id: orderId, organizationId },
    include: { items: true },
  });
  if (!existing) throw new StorefrontError("Order not found.", 404);

  const order = await prisma.$transaction(async (tx) => {
    const updated = await tx.webOrder.update({
      where: { id: orderId },
      data: {
        ...(input.status !== undefined && { status: input.status }),
        ...(input.paymentStatus !== undefined && { paymentStatus: input.paymentStatus }),
      },
      include: { items: true },
    });

    if (
      input.status === "Cancelled" &&
      existing.status !== "Cancelled"
    ) {
      for (const item of existing.items) {
        const unitIds = Array.isArray(item.reservedUnitIds)
          ? (item.reservedUnitIds as string[])
          : [];
        if (unitIds.length === 0) continue;

        await tx.inventoryUnit.updateMany({
          where: {
            id: { in: unitIds },
            status: InventoryUnitStatus.Reserved,
          },
          data: { status: InventoryUnitStatus.Available },
        });

        await syncProductStockInTx(tx, item.productId, {
          reason: `Web order ${existing.orderNo} cancelled — units released`,
          performedByName: "Store Admin",
          newUnitStatus: InventoryUnitStatus.Available,
        });
      }
    }

    if (
      input.status === "Delivered" &&
      existing.status !== "Delivered"
    ) {
      for (const item of existing.items) {
        const unitIds = Array.isArray(item.reservedUnitIds)
          ? (item.reservedUnitIds as string[])
          : [];
        if (unitIds.length === 0) continue;

        await tx.inventoryUnit.updateMany({
          where: {
            id: { in: unitIds },
            status: InventoryUnitStatus.Reserved,
          },
          data: { status: InventoryUnitStatus.Sold },
        });

        await syncProductStockInTx(tx, item.productId, {
          reason: `Web order ${existing.orderNo} delivered — units sold`,
          performedByName: "Store Admin",
          newUnitStatus: InventoryUnitStatus.Sold,
        });
      }
    }

    return updated;
  });

  return toWebOrderDto(order);
};

export const ensureStorefrontSettings = async (
  organizationId: string,
): Promise<void> => {
  await prisma.storefrontSettings.upsert({
    where: { organizationId },
    create: { organizationId },
    update: {},
  });
};

export const getStorefrontStats = async (
  organizationId: string,
): Promise<{
  publishedProducts: number;
  totalProducts: number;
  collections: number;
  webOrders: number;
  pendingOrders: number;
}> => {
  const [publishedProducts, totalProducts, collections, webOrders, pendingOrders] =
    await Promise.all([
      prisma.product.count({
        where: { organizationId, publishedToStorefront: true },
      }),
      prisma.product.count({ where: { organizationId } }),
      prisma.storefrontCollection.count({ where: { organizationId, active: true } }),
      prisma.webOrder.count({ where: { organizationId } }),
      prisma.webOrder.count({
        where: { organizationId, status: "Pending" },
      }),
    ]);

  return {
    publishedProducts,
    totalProducts,
    collections,
    webOrders,
    pendingOrders,
  };
};
