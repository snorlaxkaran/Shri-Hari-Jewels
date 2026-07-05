import {
  StoneCategory,
  StoneOriginType,
  StoneShape,
  StoneUOM,
  type Prisma,
} from "@prisma/client";

/** Placeholder specs for auto-created stone master entries. */
export const QUICK_ADD_SHAPE = StoneShape.Cabochon;
export const QUICK_ADD_SIZE_MM = "N/A";
export const QUICK_ADD_COLOR = "Unspecified";

type PrismaTx = Prisma.TransactionClient;

const slugifyStoneCode = (name: string): string => {
  const slug = name
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24);
  return slug || "STONE";
};

export const inferStoneCategory = (stoneName: string): StoneCategory => {
  const normalized = stoneName.toLowerCase();
  if (
    normalized.includes("diamond") ||
    normalized.includes("polki") ||
    normalized.includes("rosecut")
  ) {
    return StoneCategory.Diamond;
  }
  if (
    normalized.includes("cz") ||
    normalized === "zircon" ||
    normalized === "color zircon" ||
    normalized === "colour zircon"
  ) {
    return StoneCategory.CZ;
  }
  if (
    ["ruby", "emerald", "sapphire", "pearl", "coral", "topaz"].some((token) =>
      normalized.includes(token),
    )
  ) {
    return StoneCategory.Precious;
  }
  return StoneCategory.SemiPrecious;
};

/**
 * Find or create a minimal StoneMaster for simplified stone stock entry.
 * Matches on material name + placeholder shape/size so repeated entries
 * of the same type reuse one auto-created catalog row.
 */
export const findOrCreateStoneMasterForEntry = async (
  tx: PrismaTx,
  organizationId: string,
  stoneName: string,
  uom: StoneUOM,
  createdByName: string,
) => {
  const normalizedName = stoneName.trim();
  const existing = await tx.stoneMaster.findFirst({
    where: {
      organizationId,
      isAutoCreated: true,
      stoneMaterial: { equals: normalizedName, mode: "insensitive" },
      shape: QUICK_ADD_SHAPE,
      sizeMm: QUICK_ADD_SIZE_MM,
    },
  });
  if (existing) {
    if (existing.uom !== uom) {
      return tx.stoneMaster.update({
        where: { id: existing.id },
        data: { uom },
      });
    }
    return existing;
  }

  const stoneCategory = inferStoneCategory(normalizedName);
  const stoneCode = `QA-${slugifyStoneCode(normalizedName)}`;

  return tx.stoneMaster.create({
    data: {
      organizationId,
      stoneCode,
      stoneName: normalizedName,
      stoneCategory,
      stoneType: StoneOriginType.Natural,
      stoneMaterial: normalizedName,
      shape: QUICK_ADD_SHAPE,
      sizeMm: QUICK_ADD_SIZE_MM,
      color: QUICK_ADD_COLOR,
      uom,
      isAutoCreated: true,
      createdByName,
    },
  });
};

/** @deprecated Use findOrCreateStoneMasterForEntry — kept for legacy quick-add by category. */
export const findOrCreateQuickAddStoneMaster = async (
  tx: PrismaTx,
  organizationId: string,
  stoneCategory: StoneCategory,
  createdByName: string,
) => {
  const CATEGORY_LABELS: Record<StoneCategory, string> = {
    CZ: "CZ",
    Diamond: "Diamond",
    Precious: "Precious",
    SemiPrecious: "Semi-Precious",
  };
  return findOrCreateStoneMasterForEntry(
    tx,
    organizationId,
    CATEGORY_LABELS[stoneCategory],
    StoneUOM.Pcs,
    createdByName,
  );
};
