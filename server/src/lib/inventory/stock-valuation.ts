import { InventoryUnitStatus, type Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { organizationBranchFilter } from "../branches/access.js";
import { getCurrentMarketRates } from "../market-rates/service.js";
import {
  resolveUnitDisplayPrice,
  type ProductForPricing,
} from "./unit-pricing.js";

export type UnitForStockValuation = {
  status: InventoryUnitStatus;
  listPrice: ProductForPricing["price"] | null;
  product: ProductForPricing;
};

const valuationUnitSelect = {
  listPrice: true,
  status: true,
  branchId: true,
  product: {
    select: {
      sku: true,
      name: true,
      category: true,
      metal: true,
      purity: true,
      weightGrams: true,
      price: true,
    },
  },
  branch: { select: { name: true } },
} satisfies Prisma.InventoryUnitSelect;

export type StockValuationUnit = Prisma.InventoryUnitGetPayload<{
  select: typeof valuationUnitSelect;
}>;

export type StockValuationFilters = {
  category?: string;
  department?: string;
};

export const fetchAvailableUnitsForValuation = async (
  organizationId: string,
  branchId?: string,
  filters: StockValuationFilters = {},
): Promise<{
  units: StockValuationUnit[];
  marketRates: Awaited<ReturnType<typeof getCurrentMarketRates>>;
}> => {
  const marketRates = await getCurrentMarketRates(organizationId);
  const units = await prisma.inventoryUnit.findMany({
    where: {
      ...organizationBranchFilter(organizationId, branchId),
      status: InventoryUnitStatus.Available,
      ...(filters.category || filters.department
        ? {
            product: {
              ...(filters.category ? { category: filters.category } : {}),
              ...(filters.department ? { metal: filters.department } : {}),
            },
          }
        : {}),
    },
    select: valuationUnitSelect,
  });

  return { units, marketRates };
};

export const resolveAvailableUnitValue = (
  unit: UnitForStockValuation,
  marketRates: Awaited<ReturnType<typeof getCurrentMarketRates>>,
): number =>
  resolveUnitDisplayPrice(unit, unit.product, marketRates).price;

export const sumAvailableUnitValues = (
  units: UnitForStockValuation[],
  marketRates: Awaited<ReturnType<typeof getCurrentMarketRates>>,
): number =>
  units.reduce(
    (sum, unit) => sum + resolveAvailableUnitValue(unit, marketRates),
    0,
  );
