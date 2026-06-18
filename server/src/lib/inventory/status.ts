import { ProductStockStatus } from "@prisma/client";

const LOW_STOCK_THRESHOLD = 5;

export const getStockStatus = (quantity: number): ProductStockStatus => {
  if (quantity <= 0) return ProductStockStatus.OutOfStock;
  if (quantity <= LOW_STOCK_THRESHOLD) return ProductStockStatus.LowStock;
  return ProductStockStatus.InStock;
};

/** Map DB enum to API string values the client expects */
export const toApiProductStockStatus = (
  status: ProductStockStatus,
): "In Stock" | "Low Stock" | "Out of Stock" => {
  switch (status) {
    case ProductStockStatus.InStock:
      return "In Stock";
    case ProductStockStatus.LowStock:
      return "Low Stock";
    default:
      return "Out of Stock";
  }
};
