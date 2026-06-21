import type { InventoryUnit, Sale } from "@prisma/client";
import type { MarketRatesCurrent } from "../../types.js";
import { moneyToNumber } from "../money.js";
import {
  calculateSellingPrice,
  resolveMakingChargesPct,
  resolveMarketRateForProduct,
} from "../pricing/b2b-price.js";

export type UnitPriceSource = "live" | "sold" | "locked";

export type UnitDisplayPrice = {
  price: number;
  priceSource: UnitPriceSource;
};

type ProductForPricing = {
  metal: string;
  purity: string;
  weightGrams: number;
  price: number | { toString(): string };
};

type UnitWithSale = InventoryUnit & { sale?: Sale | null };

export const computeLiveListPriceForProduct = (
  product: ProductForPricing,
  marketRates: MarketRatesCurrent,
): number => {
  const marketRate = resolveMarketRateForProduct(
    product.metal,
    product.purity,
    marketRates.gold22k,
    marketRates.silver925,
  );

  if (marketRate == null) {
    return moneyToNumber(String(product.price));
  }

  const makingPct = resolveMakingChargesPct(
    product.metal,
    marketRates.goldMakingChargesPct,
    marketRates.silverMakingChargesPct,
  );
  const metalKind =
    product.metal === "Silver" ? ("Silver" as const) : ("Gold" as const);
  const breakdown = calculateSellingPrice({
    weightGrams: product.weightGrams,
    metal: metalKind,
    makingChargesPct: makingPct,
    marketRatePerGram: marketRate,
  });

  return breakdown.totalPrice;
};

export const resolveUnitDisplayPrice = (
  unit: UnitWithSale,
  product: ProductForPricing,
  marketRates?: MarketRatesCurrent,
): UnitDisplayPrice => {
  if (unit.sale) {
    return {
      price: moneyToNumber(unit.sale.listPrice),
      priceSource: "sold",
    };
  }

  if (unit.status === "Available" && marketRates) {
    return {
      price: computeLiveListPriceForProduct(product, marketRates),
      priceSource: "live",
    };
  }

  if (unit.listPrice != null) {
    return {
      price: moneyToNumber(String(unit.listPrice)),
      priceSource: "locked",
    };
  }

  return {
    price: moneyToNumber(String(product.price)),
    priceSource: "locked",
  };
};

export const computeListPriceBreakdownForProduct = (
  product: ProductForPricing,
  marketRates: MarketRatesCurrent,
) => {
  const marketRate = resolveMarketRateForProduct(
    product.metal,
    product.purity,
    marketRates.gold22k,
    marketRates.silver925,
  );

  if (marketRate == null) {
    const listPrice = moneyToNumber(String(product.price));
    return { listPrice, priceBreakdown: undefined };
  }

  const makingPct = resolveMakingChargesPct(
    product.metal,
    marketRates.goldMakingChargesPct,
    marketRates.silverMakingChargesPct,
  );
  const metalKind =
    product.metal === "Silver" ? ("Silver" as const) : ("Gold" as const);
  const breakdown = calculateSellingPrice({
    weightGrams: product.weightGrams,
    metal: metalKind,
    makingChargesPct: makingPct,
    marketRatePerGram: marketRate,
  });

  return {
    listPrice: breakdown.totalPrice,
    priceBreakdown: {
      metalValue: breakdown.metalValue,
      makingCharges: breakdown.makingCharges,
      stoneCharges: breakdown.stoneCharges,
      listPrice: breakdown.totalPrice,
      ratePerGram: breakdown.ratePerGram,
      makingChargesPct: makingPct,
      weightGrams: product.weightGrams,
    },
  };
};
