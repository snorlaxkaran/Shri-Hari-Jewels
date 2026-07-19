import { api } from "./client";
import type { NewProductCollectionInput, ProductCollection } from "@/lib/types";

export const fetchProductCollections = async (
  activeOnly = true,
): Promise<ProductCollection[]> => {
  const { data } = await api.get<ProductCollection[]>("/api/product-collections", {
    params: { activeOnly },
  });
  return data;
};

export const createProductCollection = async (
  input: NewProductCollectionInput,
): Promise<ProductCollection> => {
  const { data } = await api.post<ProductCollection>("/api/product-collections", input);
  return data;
};
