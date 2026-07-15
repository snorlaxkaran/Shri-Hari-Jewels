import axios from "axios";
import { API_BASE_URL } from "@/lib/api/client";
import type {
  CheckoutInput,
  StorefrontCollection,
  StorefrontConfig,
  StorefrontProduct,
  WebOrder,
} from "@/lib/storefront/types";

const publicApi = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

export const fetchStorefrontStatus = async (
  slug: string,
): Promise<{
  exists: boolean;
  active: boolean;
  enabled: boolean;
  businessName: string | null;
  slug: string;
}> => {
  const { data } = await publicApi.get(`/api/storefront/${slug}/status`);
  return data;
};

export const fetchStorefrontConfig = async (
  slug: string,
): Promise<StorefrontConfig> => {
  const { data } = await publicApi.get<StorefrontConfig>(
    `/api/storefront/${slug}/config`,
  );
  return data;
};

export type ProductListParams = {
  category?: string;
  metal?: string;
  search?: string;
  collection?: string;
  sortBy?: "price" | "name" | "newest";
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
};

export const fetchStorefrontProducts = async (
  slug: string,
  params: ProductListParams = {},
): Promise<{ products: StorefrontProduct[]; total: number }> => {
  const { data } = await publicApi.get<{ products: StorefrontProduct[]; total: number }>(
    `/api/storefront/${slug}/products`,
    { params },
  );
  return data;
};

export const fetchStorefrontProduct = async (
  slug: string,
  productId: string,
): Promise<StorefrontProduct> => {
  const { data } = await publicApi.get<StorefrontProduct>(
    `/api/storefront/${slug}/products/${productId}`,
  );
  return data;
};

export const fetchStorefrontCollections = async (
  slug: string,
  includeProducts = false,
): Promise<StorefrontCollection[]> => {
  const { data } = await publicApi.get<StorefrontCollection[]>(
    `/api/storefront/${slug}/collections`,
    { params: { includeProducts } },
  );
  return data;
};

export const fetchStorefrontCollection = async (
  slug: string,
  collectionSlug: string,
): Promise<StorefrontCollection> => {
  const { data } = await publicApi.get<StorefrontCollection>(
    `/api/storefront/${slug}/collections/${collectionSlug}`,
  );
  return data;
};

export const fetchStorefrontCategories = async (
  slug: string,
): Promise<string[]> => {
  const { data } = await publicApi.get<string[]>(
    `/api/storefront/${slug}/categories`,
  );
  return data;
};

export const placeStorefrontOrder = async (
  slug: string,
  input: CheckoutInput,
): Promise<WebOrder> => {
  const { data } = await publicApi.post<WebOrder>(
    `/api/storefront/${slug}/checkout`,
    input,
  );
  return data;
};

export const fetchStorefrontOrder = async (
  slug: string,
  orderNo: string,
): Promise<WebOrder> => {
  const { data } = await publicApi.get<WebOrder>(
    `/api/storefront/${slug}/orders/${orderNo}`,
  );
  return data;
};

export const resolveStorefrontByHost = async (
  host: string,
): Promise<{ slug: string; name: string } | null> => {
  try {
    const { data } = await publicApi.get<{ slug: string; name: string }>(
      "/api/storefront/resolve",
      { params: { host } },
    );
    return data;
  } catch {
    return null;
  }
};

export const formatStorePrice = (price: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(price);
