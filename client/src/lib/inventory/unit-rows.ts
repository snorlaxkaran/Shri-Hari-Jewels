import type {
  InventoryItem,
  InventoryUnitPriceSource,
  InventoryUnitStatus,
  MetalType,
  Purity,
} from "@/lib/types";

export type InventoryUnitRow = {
  unitId: string;
  productId: string;
  itemCode: string;
  sku: string;
  name: string;
  category: string;
  metal: MetalType;
  purity: Purity;
  weightGrams: number;
  stoneCarat?: number;
  makingCharges: number;
  price: number;
  priceSource: InventoryUnitPriceSource;
  status: InventoryUnitStatus;
  branchId?: string;
  branchName?: string;
  createdAt: string;
  branchTransferredAt?: string;
  imageUrl?: string;
  huid?: string;
  hallmarkNumber?: string;
};

export const flattenInventoryToUnitRows = (
  items: InventoryItem[],
): InventoryUnitRow[] =>
  items.flatMap((product) =>
    product.units.map((unit) => ({
      unitId: unit.id,
      productId: product.id,
      itemCode: unit.itemCode,
      sku: product.sku,
      name: product.name,
      category: product.category,
      metal: product.metal,
      purity: product.purity,
      weightGrams: product.weightGrams,
      stoneCarat: product.stoneCarat,
      makingCharges: product.makingCharges,
      price: unit.price,
      priceSource: unit.priceSource,
      status: unit.status,
      branchId: unit.branchId,
      branchName: unit.branchName,
      createdAt: unit.createdAt,
      branchTransferredAt: unit.branchTransferredAt,
      imageUrl: product.images?.[0]?.url,
      huid: unit.huid,
      hallmarkNumber: unit.hallmarkNumber,
    })),
  );

export const findProductForUnitRow = (
  items: InventoryItem[],
  row: InventoryUnitRow,
): InventoryItem | undefined =>
  items.find((item) => item.id === row.productId);
