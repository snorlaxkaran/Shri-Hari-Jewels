import type { Prisma } from "@prisma/client";
import { prisma } from "../db.js";
import { calculatePhysicalMetalWeightPerSet } from "../pricing/jewelry-price.js";
import { hydrateRunItemWeights } from "./finished-goods.js";

type TransactionClient = Prisma.TransactionClient;
type DbClient = TransactionClient | typeof prisma;

export type MetalWeightItem = {
  elementName: string;
  elementType: string;
  qtyPerSet: number;
  weightGramsPerPc: number | null;
  metalWeightGrams?: number | null;
  metalLotId?: string | null;
  motifId?: string | null;
};

export const loadMotifWeightsById = async (
  client: DbClient,
  motifIds: string[],
): Promise<Map<string, number>> => {
  if (motifIds.length === 0) return new Map();

  const motifs = await client.motif.findMany({
    where: { id: { in: motifIds } },
    select: { id: true, weightGrams: true },
  });

  return new Map(
    motifs
      .filter((m) => m.weightGrams != null && m.weightGrams > 0)
      .map((m) => [m.id, m.weightGrams!]),
  );
};

export const hydrateDesignElementsForMetal = async (
  designId: string,
  client: DbClient = prisma,
): Promise<MetalWeightItem[]> => {
  const elements = await client.designElement.findMany({
    where: { designId },
    select: {
      name: true,
      type: true,
      qtyPerSet: true,
      weightGramsPerPc: true,
      motifId: true,
    },
  });

  const motifWeightById = await loadMotifWeightsById(
    client,
    elements
      .map((el) => el.motifId)
      .filter((id): id is string => id != null),
  );

  return elements.map((el) => {
    let weightGramsPerPc = el.weightGramsPerPc;
    if ((weightGramsPerPc == null || weightGramsPerPc <= 0) && el.motifId) {
      const motifWeight = motifWeightById.get(el.motifId);
      if (motifWeight != null && motifWeight > 0) {
        weightGramsPerPc = motifWeight;
      }
    }

    return {
      elementName: el.name,
      elementType: el.type,
      qtyPerSet: el.qtyPerSet,
      weightGramsPerPc,
      metalWeightGrams: null,
      motifId: el.motifId,
    };
  });
};

export const computeMetalPerSetGramsFromDesign = async (
  designId: string,
  client: DbClient = prisma,
): Promise<number> => {
  const elements = await hydrateDesignElementsForMetal(designId, client);
  return calculatePhysicalMetalWeightPerSet(
    elements.map((el) => ({
      elementName: el.elementName,
      elementType: el.elementType,
      qtyPerSet: el.qtyPerSet,
      weightGramsPerPc: el.weightGramsPerPc,
      metalWeightGrams: el.metalWeightGrams ?? null,
    })),
  );
};

export const hydrateRunItemsForMetalInTx = async (
  tx: TransactionClient,
  designId: string,
  items: MetalWeightItem[],
): Promise<MetalWeightItem[]> => {
  const designElements = await tx.designElement.findMany({
    where: { designId },
    select: {
      name: true,
      type: true,
      weightGramsPerPc: true,
      motifId: true,
    },
  });

  const motifIds = new Set<string>();
  for (const item of items) {
    if (item.motifId) motifIds.add(item.motifId);
  }
  for (const element of designElements) {
    if (element.motifId) motifIds.add(element.motifId);
  }

  const motifWeightById = await loadMotifWeightsById(tx, [...motifIds]);

  return hydrateRunItemWeights(
    items.map((item) => ({
      elementName: item.elementName,
      elementType: item.elementType,
      qtyPerSet: item.qtyPerSet,
      unitValue: null,
      weightGramsPerPc: item.weightGramsPerPc,
      metalWeightGrams: item.metalWeightGrams ?? null,
      metalLotId: item.metalLotId ?? null,
      czWeight: null,
      motifId: item.motifId ?? null,
    })),
    designElements,
    motifWeightById,
  ).map((item) => ({
    elementName: item.elementName,
    elementType: item.elementType,
    qtyPerSet: item.qtyPerSet,
    weightGramsPerPc: item.weightGramsPerPc ?? null,
    metalWeightGrams: item.metalWeightGrams ?? null,
    metalLotId: item.metalLotId ?? null,
  }));
};
