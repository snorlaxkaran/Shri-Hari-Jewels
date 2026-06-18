import { moneyToNumber } from "../money.js";
import type { MetalType, Purity } from "../../types.js";

export type JewelryPriceBreakdown = {
  metalValue: number;
  componentValue: number;
  makingCharges: number;
  totalPrice: number;
  weightGrams: number;
  stoneCarat: number;
  metalRatePerGram: number;
  components: Array<{
    name: string;
    type: string;
    qtyPerSet: number;
    unitValue: number;
    lineValue: number;
  }>;
};

type PricingItem = {
  elementName: string;
  elementType: string;
  qtyPerSet: number;
  unitValue?: number | null;
  weightGramsPerPc?: number | null;
  metalWeightGrams?: number | null;
  metalLotId?: string | null;
  czWeight?: number | null;
};

type MetalLotRate = {
  id: string;
  metalType: string;
  purity: string;
  currentRate: number;
};

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export const resolveMetalRatePerGram = (
  metal: MetalType,
  purity: Purity,
  items: PricingItem[],
  metalLots: MetalLotRate[],
): number => {
  const linkedLotId = items.find(
    (item) => item.elementType === "Casting" && item.metalLotId,
  )?.metalLotId;

  if (linkedLotId) {
    const linkedLot = metalLots.find((lot) => lot.id === linkedLotId);
    if (linkedLot) return linkedLot.currentRate;
  }

  const matchingLots = metalLots.filter(
    (lot) => lot.metalType === metal && lot.purity === purity,
  );
  if (matchingLots.length > 0) {
    const total = matchingLots.reduce((sum, lot) => sum + lot.currentRate, 0);
    return roundMoney(total / matchingLots.length);
  }

  const metalLotsOnly = metalLots.filter((lot) => lot.metalType === metal);
  if (metalLotsOnly.length > 0) {
    const total = metalLotsOnly.reduce((sum, lot) => sum + lot.currentRate, 0);
    return roundMoney(total / metalLotsOnly.length);
  }

  return 0;
};

export const calculateTotalMetalWeight = (items: PricingItem[]): number => {
  const castingItems = items.filter((item) => item.elementType === "Casting");
  if (castingItems.length === 0) return 0;

  const actualWeight = castingItems.reduce(
    (sum, item) => sum + (item.metalWeightGrams ?? 0),
    0,
  );
  if (actualWeight > 0) return roundMoney(actualWeight);

  return roundMoney(
    castingItems.reduce(
      (sum, item) =>
        sum + (item.weightGramsPerPc ?? 0) * item.qtyPerSet,
      0,
    ),
  );
};

export const calculateJewelryPrice = (input: {
  items: PricingItem[];
  metal: MetalType;
  purity: Purity;
  makingChargesPerSet?: number | null;
  metalLots: MetalLotRate[];
}): JewelryPriceBreakdown => {
  const weightGrams = calculateTotalMetalWeight(input.items);
  const metalRatePerGram = resolveMetalRatePerGram(
    input.metal,
    input.purity,
    input.items,
    input.metalLots,
  );
  const metalValue = roundMoney(weightGrams * metalRatePerGram);

  const components = input.items
    .filter((item) => item.elementType === "Motif" || item.elementType === "Stone")
    .map((item) => {
      const unitValue = item.unitValue ?? 0;
      return {
        name: item.elementName,
        type: item.elementType,
        qtyPerSet: item.qtyPerSet,
        unitValue,
        lineValue: roundMoney(unitValue * item.qtyPerSet),
      };
    });

  const componentValue = roundMoney(
    components.reduce((sum, row) => sum + row.lineValue, 0),
  );

  const stoneCarat = roundMoney(
    input.items.reduce((sum, item) => sum + (item.czWeight ?? 0), 0),
  );

  const makingCharges = roundMoney(input.makingChargesPerSet ?? 0);
  const totalPrice = roundMoney(metalValue + componentValue + makingCharges);

  return {
    metalValue,
    componentValue,
    makingCharges,
    totalPrice,
    weightGrams,
    stoneCarat,
    metalRatePerGram,
    components,
  };
};

export const mapMetalLotsForPricing = (
  lots: Array<{
    id: string;
    metalType: string;
    purity: string;
    currentRate: { toString(): string } | number;
  }>,
): MetalLotRate[] =>
  lots.map((lot) => ({
    id: lot.id,
    metalType: lot.metalType,
    purity: lot.purity,
    currentRate: moneyToNumber(String(lot.currentRate)),
  }));
