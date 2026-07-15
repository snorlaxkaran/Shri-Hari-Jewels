import type {
  Product,
  ProductImage,
  StorefrontCollection,
  StorefrontCollectionProduct,
  StorefrontSettings,
  ShopSettings,
  WebOrder,
  WebOrderItem,
} from "@prisma/client";
import { moneyToNumber } from "../money.js";

export type StorefrontProductDto = {
  id: string;
  sku: string;
  name: string;
  category: string;
  metal: string;
  purity: string;
  weightGrams: number;
  price: number;
  stock: number;
  status: string;
  imageColor: string;
  storefrontDescription: string | null;
  images: Array<{ id: string; url: string; name: string }>;
};

export type StorefrontCollectionDto = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  productCount: number;
  products?: StorefrontProductDto[];
};

export type StorefrontConfigDto = {
  slug: string;
  businessName: string;
  enabled: boolean;
  tagline: string | null;
  heroTitle: string | null;
  heroSubtitle: string | null;
  aboutText: string | null;
  primaryColor: string;
  accentColor: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  whatsappNumber: string | null;
  shippingNote: string | null;
  returnPolicy: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  gstNumber: string | null;
};

export type WebOrderDto = {
  id: string;
  orderNo: string;
  customerName: string;
  customerEmail: string | null;
  customerMobile: string;
  addressLine1: string;
  addressLine2: string | null;
  city: string;
  state: string;
  pincode: string;
  country: string;
  status: string;
  paymentStatus: string;
  totalAmount: number;
  notes: string | null;
  items: Array<{
    id: string;
    productId: string;
    productSku: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }>;
  createdAt: string;
};

type ProductWithImages = Product & { images: ProductImage[] };

export const toStorefrontProduct = (
  product: ProductWithImages,
  availableStock: number,
): StorefrontProductDto => ({
  id: product.id,
  sku: product.sku,
  name: product.name,
  category: product.category,
  metal: product.metal,
  purity: product.purity,
  weightGrams: product.weightGrams,
  price: moneyToNumber(product.price),
  stock: availableStock,
  status: availableStock > 0 ? "In Stock" : "Out of Stock",
  imageColor: product.imageColor,
  storefrontDescription: product.storefrontDescription,
  images: product.images.map((img) => ({
    id: img.id,
    url: img.url,
    name: img.name,
  })),
});

type CollectionWithProducts = StorefrontCollection & {
  products: Array<
    StorefrontCollectionProduct & {
      product: ProductWithImages;
    }
  >;
};

export const toStorefrontCollection = (
  collection: CollectionWithProducts,
  includeProducts = false,
): StorefrontCollectionDto => {
  const dto: StorefrontCollectionDto = {
    id: collection.id,
    name: collection.name,
    slug: collection.slug,
    description: collection.description,
    imageUrl: collection.imageUrl,
    productCount: collection.products.length,
  };

  if (includeProducts) {
    dto.products = collection.products
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((link) =>
        toStorefrontProduct(
          link.product,
          link.product.stock,
        ),
      );
  }

  return dto;
};

export const toStorefrontConfig = (
  slug: string,
  settings: StorefrontSettings,
  shop: ShopSettings | null,
): StorefrontConfigDto => ({
  slug,
  businessName: shop?.businessName ?? "Jewellery Store",
  enabled: settings.enabled,
  tagline: settings.tagline,
  heroTitle: settings.heroTitle,
  heroSubtitle: settings.heroSubtitle,
  aboutText: settings.aboutText,
  primaryColor: settings.primaryColor,
  accentColor: settings.accentColor,
  logoUrl: settings.logoUrl,
  bannerUrl: settings.bannerUrl,
  contactEmail: settings.contactEmail ?? shop?.phone ?? null,
  contactPhone: settings.contactPhone ?? shop?.phone ?? null,
  instagramUrl: settings.instagramUrl,
  facebookUrl: settings.facebookUrl,
  whatsappNumber: settings.whatsappNumber,
  shippingNote: settings.shippingNote,
  returnPolicy: settings.returnPolicy,
  address: shop?.addressLine1 ?? shop?.address ?? null,
  city: shop?.city ?? null,
  state: shop?.state ?? null,
  pincode: shop?.pincode ?? null,
  gstNumber: shop?.gstNumber ?? null,
});

type WebOrderWithItems = WebOrder & { items: WebOrderItem[] };

export const toWebOrderDto = (order: WebOrderWithItems): WebOrderDto => ({
  id: order.id,
  orderNo: order.orderNo,
  customerName: order.customerName,
  customerEmail: order.customerEmail,
  customerMobile: order.customerMobile,
  addressLine1: order.addressLine1,
  addressLine2: order.addressLine2,
  city: order.city,
  state: order.state,
  pincode: order.pincode,
  country: order.country,
  status: order.status,
  paymentStatus: order.paymentStatus,
  totalAmount: moneyToNumber(order.totalAmount),
  notes: order.notes,
  items: order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    productSku: item.productSku,
    productName: item.productName,
    quantity: item.quantity,
    unitPrice: moneyToNumber(item.unitPrice),
    lineTotal: moneyToNumber(item.lineTotal),
  })),
  createdAt: order.createdAt.toISOString(),
});
