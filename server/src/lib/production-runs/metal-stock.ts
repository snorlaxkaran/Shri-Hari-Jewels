import { prisma } from "../db.js";
import { calculatePhysicalMetalWeightPerSet } from "../pricing/jewelry-price.js";
import type { MetalStockWarning } from "../../types.js";

const roundWeight = (value: number) => Math.round(value * 100) / 100;

type DesignElementForMetal = {
  elementType: string;
  qtyPerSet: number;
  weightGramsPerPc: number | null;
};

export const computeMetalPerSetGrams = (
  elements: DesignElementForMetal[],
): number =>
  calculatePhysicalMetalWeightPerSet(
    elements.map((el) => ({
      elementName: "",
      elementType: el.elementType,
      qtyPerSet: el.qtyPerSet,
      weightGramsPerPc: el.weightGramsPerPc,
      metalWeightGrams: null,
    })),
  );

export const getAvailableMetalGrams = async (
  branchId: string,
  metal: string,
  purity: string,
): Promise<number> => {
  const lots = await prisma.metalLot.findMany({
    where: {
      branchId,
      metalType: metal,
      purity,
      weightGrams: { gt: 0 },
    },
    select: { weightGrams: true },
  });
  return roundWeight(lots.reduce((sum, lot) => sum + lot.weightGrams, 0));
};

export const checkMetalStock = async (
  designId: string,
  setsOrdered: number,
  branchId: string,
): Promise<MetalStockWarning | null> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    select: {
      metal: true,
      purity: true,
      elements: {
        select: {
          type: true,
          qtyPerSet: true,
          weightGramsPerPc: true,
        },
      },
    },
  });

  if (!design?.metal || !design.purity) return null;

  const elements = design.elements.map((el) => ({
    elementType: el.type,
    qtyPerSet: el.qtyPerSet,
    weightGramsPerPc: el.weightGramsPerPc,
  }));

  const perSetGrams = computeMetalPerSetGrams(elements);
  if (perSetGrams <= 0) return null;

  const requiredGrams = roundWeight(perSetGrams * setsOrdered);
  const availableGrams = await getAvailableMetalGrams(
    branchId,
    design.metal,
    design.purity,
  );

  if (availableGrams >= requiredGrams) return null;

  const maxSets = Math.max(0, Math.floor(availableGrams / perSetGrams));

  return {
    metal: design.metal,
    purity: design.purity,
    requiredGrams,
    availableGrams,
    shortfallGrams: roundWeight(requiredGrams - availableGrams),
    perSetGrams,
    requestedSets: setsOrdered,
    maxSets,
  };
};
