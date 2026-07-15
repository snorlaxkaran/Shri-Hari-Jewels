import { api } from "@/lib/api/client";
import type {
  PublishableProduct,
  StorefrontAdminSettings,
  StorefrontCollection,
  StorefrontStats,
  WebOrder,
} from "@/lib/storefront/types";

export const fetchStorefrontAdminSettings = async (): Promise<StorefrontAdminSettings> => {
  const { data } = await api.get<StorefrontAdminSettings>("/api/storefront-admin/settings");
  return data;
};

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

export const updateStorefrontAdminSettings = async (
  input: UpdateStorefrontSettingsInput,
): Promise<StorefrontAdminSettings> => {
  const { data } = await api.patch<StorefrontAdminSettings>(
    "/api/storefront-admin/settings",
    input,
  );
  return data;
};

export const updateStorefrontDomain = async (
  customDomain: string | null,
): Promise<StorefrontAdminSettings> => {
  const { data } = await api.patch<StorefrontAdminSettings>(
    "/api/storefront-admin/domain",
    { customDomain },
  );
  return data;
};

export const fetchStorefrontStats = async (): Promise<StorefrontStats> => {
  const { data } = await api.get<StorefrontStats>("/api/storefront-admin/stats");
  return data;
};

export const fetchPublishableProducts = async (): Promise<PublishableProduct[]> => {
  const { data } = await api.get<PublishableProduct[]>("/api/storefront-admin/products");
  return data;
};

export const setProductPublished = async (
  productId: string,
  published: boolean,
  storefrontDescription?: string | null,
): Promise<void> => {
  await api.patch(`/api/storefront-admin/products/${productId}/publish`, {
    published,
    storefrontDescription,
  });
};

export const bulkPublishProducts = async (
  productIds: string[],
  published: boolean,
): Promise<number> => {
  const { data } = await api.post<{ count: number }>(
    "/api/storefront-admin/products/bulk-publish",
    { productIds, published },
  );
  return data.count;
};

export const fetchAdminCollections = async (): Promise<StorefrontCollection[]> => {
  const { data } = await api.get<StorefrontCollection[]>("/api/storefront-admin/collections");
  return data;
};

export type CreateCollectionInput = {
  name: string;
  slug?: string;
  description?: string;
  imageUrl?: string;
  sortOrder?: number;
  active?: boolean;
};

export const createAdminCollection = async (
  input: CreateCollectionInput,
): Promise<StorefrontCollection> => {
  const { data } = await api.post<StorefrontCollection>(
    "/api/storefront-admin/collections",
    input,
  );
  return data;
};

export const updateAdminCollection = async (
  id: string,
  input: Partial<CreateCollectionInput>,
): Promise<StorefrontCollection> => {
  const { data } = await api.patch<StorefrontCollection>(
    `/api/storefront-admin/collections/${id}`,
    input,
  );
  return data;
};

export const deleteAdminCollection = async (id: string): Promise<void> => {
  await api.delete(`/api/storefront-admin/collections/${id}`);
};

export const setAdminCollectionProducts = async (
  id: string,
  productIds: string[],
): Promise<StorefrontCollection> => {
  const { data } = await api.put<StorefrontCollection>(
    `/api/storefront-admin/collections/${id}/products`,
    { productIds },
  );
  return data;
};

export const fetchWebOrders = async (): Promise<WebOrder[]> => {
  const { data } = await api.get<WebOrder[]>("/api/storefront-admin/orders");
  return data;
};

export const updateWebOrder = async (
  id: string,
  input: { status?: string; paymentStatus?: string },
): Promise<WebOrder> => {
  const { data } = await api.patch<WebOrder>(`/api/storefront-admin/orders/${id}`, input);
  return data;
};
