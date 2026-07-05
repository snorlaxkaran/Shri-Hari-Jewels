import { prisma } from "../db.js";

export type ElementStoneDefaults = {
  czStones: number | null;
  czWeight: number | null;
};

export const computeElementStoneDefaults = async (
  designId: string,
  setsOrdered: number,
): Promise<Map<string, ElementStoneDefaults>> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: {
      elements: {
        orderBy: { sortOrder: "asc" },
        include: {
          motif: {
            include: {
              stones: { orderBy: { sortOrder: "asc" } },
            },
          },
        },
      },
    },
  });

  const defaults = new Map<string, ElementStoneDefaults>();
  if (!design) return defaults;

  for (const element of design.elements) {
    const isStoneElement =
      element.type === "Stone" || element.type === "Motif";
    if (!isStoneElement) continue;

    if (element.motif?.stones.length) {
      let stones = 0;
      for (const motifStone of element.motif.stones) {
        stones +=
          motifStone.qtyPerMotif * element.qtyPerSet * setsOrdered;
      }
      defaults.set(element.id, {
        czStones: stones > 0 ? stones : null,
        czWeight: null,
      });
      continue;
    }

    if (element.type === "Stone") {
      const totalStones = element.qtyPerSet * setsOrdered;
      defaults.set(element.id, {
        czStones: totalStones > 0 ? totalStones : null,
        czWeight: null,
      });
    }
  }

  return defaults;
};
