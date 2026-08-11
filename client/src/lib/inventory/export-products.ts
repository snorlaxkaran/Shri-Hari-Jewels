import { exportToExcel } from "@/lib/reports/excel";
import type { InventoryItem } from "@/lib/types";

const BASE_HEADERS = [
  "SKU",
  "Name",
  "Category",
  "Collection",
  "Metal",
  "Purity",
  "Weight (g)",
  "Price",
  "Stock",
  "Status",
] as const;

export const exportProductsExcel = (products: InventoryItem[]): void => {
  const date = new Date().toISOString().slice(0, 10);
  const rows = products.map((product) => [
    product.sku,
    product.name,
    product.category,
    product.productCollectionName ?? "",
    product.metal,
    product.purity,
    product.weightGrams,
    product.price,
    product.stock,
    product.status,
  ]);

  exportToExcel(`products-${date}`, [...BASE_HEADERS], rows);
};
