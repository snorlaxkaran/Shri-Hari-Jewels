const LOW_STOCK_THRESHOLD = 5;

export const getStockStatus = (
  quantity: number,
): "In Stock" | "Low Stock" | "Out of Stock" => {
  if (quantity <= 0) return "Out of Stock";
  if (quantity <= LOW_STOCK_THRESHOLD) return "Low Stock";
  return "In Stock";
};
