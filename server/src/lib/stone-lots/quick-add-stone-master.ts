import {
  StoneCategory,
  StoneOriginType,
  StoneShape,
  StoneUOM,
  type Prisma,
} from "@prisma/client";

/** Placeholder specs for Quick Add stone master entries. */
export const QUICK_ADD_SHAPE = StoneShape.Cabochon;
export const QUICK_ADD_SIZE_MM = "N/A";
export const QUICK_ADD_COLOR = "Unspecified";

const CATEGORY_LABELS: Record<StoneCategory, string> = {
  CZ: "CZ",
  Diamond: "Diamond",
  Precious: "Precious",
  SemiPrecious: "Semi-Precious",
};

type PrismaTx = Prisma.TransactionClient;

const quickAddStoneCode = (category: StoneCategory) => `QA-${category}`;

const quickAddStoneName = (category: StoneCategory) =>
  `${CATEGORY_LABELS[category]} — Quick Entry`;

/**
 * Find or create a minimal StoneMaster for Quick Add stock logging.
 * Matches on stoneCategory + placeholder shape/size so repeated entries
 * of the same type reuse one auto-created catalog row.
 */
export const findOrCreateQuickAddStoneMaster = async (
  tx: PrismaTx,
  organizationId: string,
  stoneCategory: StoneCategory,
  createdByName: string,
) => {
  const existing = await tx.stoneMaster.findFirst({
    where: {
      organizationId,
      isAutoCreated: true,
      stoneCategory,
      shape: QUICK_ADD_SHAPE,
      sizeMm: QUICK_ADD_SIZE_MM,
    },
  });
  if (existing) return existing;

  const stoneCode = quickAddStoneCode(stoneCategory);
  const stoneName = quickAddStoneName(stoneCategory);

  return tx.stoneMaster.create({
    data: {
      organizationId,
      stoneCode,
      stoneName,
      stoneCategory,
      stoneType: StoneOriginType.Natural,
      stoneMaterial: CATEGORY_LABELS[stoneCategory],
      shape: QUICK_ADD_SHAPE,
      sizeMm: QUICK_ADD_SIZE_MM,
      color: QUICK_ADD_COLOR,
      uom: StoneUOM.Pcs,
      isAutoCreated: true,
      createdByName,
    },
  });
};
