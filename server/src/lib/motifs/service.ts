import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import {
  isValidMotifPurityForMetal,
} from "../designs/validation.js";
import { safeRecordCatalogAudit } from "../catalog/audit.js";
import { organizationBranchFilter } from "../branches/access.js";
import { getStoneTypeAvgRate } from "../raw-inventory/stone-stock-service.js";
import { resolveStoneTypeName } from "../stone-types/service.js";
import { resolveMarketRateForMetalPurity } from "../pricing/metal-rate.js";
import type {
  Motif,
  MotifMetal,
  MotifStone,
  MotifStoneInput,
  MotifStoneType,
  MotifSubCategory,
  NewMotifInput,
  Purity,
  UpdateMotifInput,
} from "../../types.js";

export const MOTIF_METALS: MotifMetal[] = ["Silver", "Gold", "Platinum"];

export const MOTIF_STONE_TYPES: MotifStoneType[] = [
  "Glass",
  "Enamel",
  "Pearl",
  "Zircon",
  "Turquoise",
  "Black Onyx",
  "Emerald",
];

export const MOTIF_SUB_CATEGORIES: MotifSubCategory[] = [
  "Contemporary",
  "Traditional",
  "Tribal",
  "Bridal",
];

export class MotifError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "MotifError";
  }
}

type Actor = { id: string; name: string };

const motifSummary = (motif: Motif) => ({
  id: motif.id,
  name: motif.name,
  metal: motif.metal,
  purity: motif.purity,
  price: motif.price,
  makingCost: motif.makingCost,
  stones: motif.stones?.map((s) => ({
    stoneType: s.stoneType,
    qtyPerMotif: s.qtyPerMotif,
  })),
});

const motifInclude = {
  stones: {
    orderBy: { sortOrder: "asc" as const },
  },
};

type MotifRow = {
  id: string;
  name: string;
  description: string | null;
  weightGrams: number | null;
  metal: string;
  purity: string;
  stone1: string | null;
  stone2: string | null;
  stone3: string | null;
  subCategory: string;
  makingCost: { toString(): string } | null;
  price: { toString(): string } | null;
  imageUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  stones?: Array<{
    id: string;
    stoneType: string;
    qtyPerMotif: number;
    sortOrder: number;
  }>;
};

const toMotifStone = (
  row: NonNullable<MotifRow["stones"]>[number],
): MotifStone => ({
  id: row.id,
  stoneType: row.stoneType,
  qtyPerMotif: row.qtyPerMotif,
  sortOrder: row.sortOrder,
});

const toMotif = (row: MotifRow): Motif => ({
  id: row.id,
  name: row.name,
  description: row.description ?? undefined,
  weightGrams: row.weightGrams ?? undefined,
  metal: row.metal as MotifMetal,
  purity: row.purity as Purity,
  stone1: (row.stone1 as MotifStoneType) ?? undefined,
  stone2: (row.stone2 as MotifStoneType) ?? undefined,
  stone3: (row.stone3 as MotifStoneType) ?? undefined,
  subCategory: row.subCategory as MotifSubCategory,
  makingCost:
    row.makingCost != null ? moneyToNumber(String(row.makingCost)) : undefined,
  price: row.price != null ? moneyToNumber(String(row.price)) : undefined,
  stones: (row.stones ?? []).map(toMotifStone),
  imageUrl: row.imageUrl ?? undefined,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export type MotifPriceInput = {
  weightGrams?: number | null;
  metal: MotifMetal;
  purity: Purity;
  stones: MotifStoneInput[];
  organizationId?: string;
};

export const calculateMotifPrice = async (
  input: MotifPriceInput,
): Promise<number> => {
  let total = 0;

  if (input.weightGrams != null && input.weightGrams > 0) {
    const rate = await resolveMarketRateForMetalPurity(input.metal, input.purity);
    total += roundMoney(input.weightGrams * rate);
  }

  for (const stone of input.stones) {
    if (!stone.stoneType?.trim()) continue;
    if (stone.qtyPerMotif < 1) {
      throw new MotifError("Stone quantity per motif must be at least 1.");
    }
    const rate = input.organizationId
      ? await getStoneTypeAvgRate(stone.stoneType.trim(), input.organizationId)
      : 0;
    total += roundMoney(rate * stone.qtyPerMotif);
  }

  return roundMoney(total);
};

const motifStonesFromRow = (
  row: Pick<MotifRow, "stones">,
): MotifStoneInput[] =>
  (row.stones ?? []).map((stone) => ({
    stoneType: stone.stoneType,
    qtyPerMotif: stone.qtyPerMotif,
    sortOrder: stone.sortOrder,
  }));

/** Recompute and persist motif price when it no longer matches market metal + stone rates. */
export const ensureMotifPriceCurrent = async (
  row: MotifRow,
  organizationId: string,
): Promise<number> => {
  const price = await calculateMotifPrice({
    weightGrams: row.weightGrams,
    metal: row.metal as MotifMetal,
    purity: row.purity as Purity,
    stones: motifStonesFromRow(row),
    organizationId,
  });

  const stored =
    row.price != null ? moneyToNumber(String(row.price)) : null;
  if (stored === null || Math.abs(stored - price) >= 0.0001) {
    await prisma.motif.update({
      where: { id: row.id },
      data: { price },
    });
  }

  return price;
};

const validateMotifStones = async (
  stones: MotifStoneInput[] | undefined,
  organizationId: string,
) => {
  if (!stones?.length) return;
  for (const stone of stones) {
    if (!stone.stoneType?.trim()) {
      throw new MotifError("Each motif stone must have a stone type.");
    }
    if (stone.qtyPerMotif < 1) {
      throw new MotifError("Stone quantity per motif must be at least 1.");
    }
    await resolveStoneTypeName(organizationId, undefined, stone.stoneType.trim());
  }
};

const validateMotifPurity = (metal: MotifMetal, purity: Purity) => {
  if (!isValidMotifPurityForMetal(metal, purity)) {
    throw new MotifError(
      `Invalid purity "${purity}" for ${metal}. Silver requires 925; Gold and Platinum use 24K–14K.`,
    );
  }
};

const validateMotifInput = async (
  input: NewMotifInput,
  organizationId: string,
) => {
  const name = input.name?.trim();
  if (!name) throw new MotifError("Motif name is required.");

  if (!MOTIF_METALS.includes(input.metal)) {
    throw new MotifError("Invalid motif metal.");
  }
  if (!input.purity) {
    throw new MotifError("Purity is required.");
  }
  validateMotifPurity(input.metal, input.purity);
  if (!MOTIF_SUB_CATEGORIES.includes(input.subCategory)) {
    throw new MotifError("Invalid sub category.");
  }

  for (const stone of [input.stone1, input.stone2, input.stone3]) {
    if (stone && !MOTIF_STONE_TYPES.includes(stone)) {
      throw new MotifError(`Invalid stone type: ${stone}`);
    }
  }

  await validateMotifStones(input.stones, organizationId);

  if (input.weightGrams != null && input.weightGrams < 0) {
    throw new MotifError("Weight must be zero or greater.");
  }
  if (input.price != null && input.price < 0) {
    throw new MotifError("Price must be zero or greater.");
  }
  if (input.makingCost != null && input.makingCost < 0) {
    throw new MotifError("Making cost must be zero or greater.");
  }

  return {
    ...input,
    name,
    description: input.description?.trim() || undefined,
    stones: input.stones ?? [],
  };
};

const syncMotifStones = async (
  motifId: string,
  stones: MotifStoneInput[],
) => {
  await prisma.motifStone.deleteMany({ where: { motifId } });
  if (stones.length === 0) return;

  await prisma.motifStone.createMany({
    data: stones.map((stone, index) => ({
      motifId,
      stoneType: stone.stoneType.trim(),
      qtyPerMotif: stone.qtyPerMotif,
      sortOrder: stone.sortOrder ?? index,
    })),
  });
};

export const listMotifs = async (
  organizationId: string,
  branchId?: string,
): Promise<Motif[]> => {
  const rows = await prisma.motif.findMany({
    where: organizationBranchFilter(organizationId, branchId),
    include: motifInclude,
    orderBy: [{ subCategory: "asc" }, { name: "asc" }],
  });

  const motifs: Motif[] = [];
  for (const row of rows) {
    const price = await ensureMotifPriceCurrent(row, organizationId);
    motifs.push(
      toMotif({
        ...row,
        price: { toString: () => String(price) },
      }),
    );
  }
  return motifs;
};

export const getMotif = async (id: string, organizationId: string): Promise<Motif> => {
  const row = await prisma.motif.findFirst({
    where: { id, branch: { organizationId } },
    include: motifInclude,
  });
  if (!row) throw new MotifError("Motif not found.", 404);
  const price = await ensureMotifPriceCurrent(row, organizationId);
  return toMotif({
    ...row,
    price: { toString: () => String(price) },
  });
};

export const createMotif = async (
  input: NewMotifInput,
  branchId: string,
  organizationId: string,
  actor?: Actor,
  auditOptions?: { skipAudit?: boolean },
): Promise<Motif> => {
  const validated = await validateMotifInput(input, organizationId);

  const duplicate = await prisma.motif.findFirst({
    where: {
      branchId,
      name: validated.name,
      metal: validated.metal,
      purity: validated.purity,
    },
  });
  if (duplicate) {
    throw new MotifError(
      `A motif named "${validated.name}" already exists for ${validated.metal} ${validated.purity}.`,
    );
  }

  const price = await calculateMotifPrice({
    weightGrams: validated.weightGrams,
    metal: validated.metal,
    purity: validated.purity,
    stones: validated.stones,
    organizationId,
  });

  const row = await prisma.motif.create({
    data: {
      branchId,
      name: validated.name,
      description: validated.description,
      weightGrams: validated.weightGrams,
      metal: validated.metal,
      purity: validated.purity,
      stone1: validated.stone1 ?? null,
      stone2: validated.stone2 ?? null,
      stone3: validated.stone3 ?? null,
      subCategory: validated.subCategory,
      makingCost: validated.makingCost,
      price,
      imageUrl: validated.imageUrl,
    },
  });

  await syncMotifStones(row.id, validated.stones);

  const full = await prisma.motif.findUnique({
    where: { id: row.id },
    include: motifInclude,
  });
  const motif = toMotif(full!);

  if (actor && !auditOptions?.skipAudit) {
    await safeRecordCatalogAudit({
      entityType: "Motif",
      entityId: motif.id,
      entityRef: motif.name,
      action: "Create",
      newValue: motifSummary(motif),
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  return motif;
};

export const createMotifsBulk = async (
  items: NewMotifInput[],
  branchId: string,
  organizationId: string,
  actor?: Actor,
): Promise<{ created: Motif[]; errors: string[] }> => {
  const created: Motif[] = [];
  const errors: string[] = [];

  for (let i = 0; i < items.length; i++) {
    try {
      const motif = await createMotif(items[i], branchId, organizationId, actor, {
        skipAudit: true,
      });
      created.push(motif);
    } catch (error) {
      const msg =
        error instanceof MotifError
          ? error.message
          : "Failed to create motif.";
      errors.push(`Row ${i + 2}: ${msg}`);
    }
  }

  if (actor && created.length > 0) {
    await safeRecordCatalogAudit({
      entityType: "Motif",
      entityId: created[0].id,
      entityRef: `Bulk import (${created.length} motifs)`,
      action: "Import",
      newValue: created.map(motifSummary),
      reason: errors.length
        ? `${created.length} created, ${errors.length} errors`
        : `${created.length} motifs imported`,
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  return { created, errors };
};

export const updateMotif = async (
  id: string,
  input: UpdateMotifInput,
  organizationId: string,
  actor?: Actor,
): Promise<Motif> => {
  const existingRow = await prisma.motif.findUnique({
    where: { id },
    include: motifInclude,
  });
  if (!existingRow) throw new MotifError("Motif not found.", 404);
  const existing = toMotif(existingRow);

  const metal = (input.metal ?? existingRow.metal) as MotifMetal;
  const purity = (input.purity ?? existingRow.purity) as Purity;

  if (input.metal && !MOTIF_METALS.includes(input.metal)) {
    throw new MotifError("Invalid motif metal.");
  }
  if (input.purity || input.metal) {
    validateMotifPurity(metal, purity);
  }
  if (input.subCategory && !MOTIF_SUB_CATEGORIES.includes(input.subCategory)) {
    throw new MotifError("Invalid sub category.");
  }
  for (const stone of [input.stone1, input.stone2, input.stone3]) {
    if (stone && !MOTIF_STONE_TYPES.includes(stone)) {
      throw new MotifError(`Invalid stone type: ${stone}`);
    }
  }

  if (input.stones) await validateMotifStones(input.stones, organizationId);

  const name = input.name?.trim() ?? existing.name;
  if (input.name !== undefined || input.metal !== undefined || input.purity !== undefined) {
    const duplicate = await prisma.motif.findFirst({
      where: {
        branchId: existingRow.branchId,
        name,
        metal,
        purity,
        NOT: { id },
      },
    });
    if (duplicate) {
      throw new MotifError(
        `A motif named "${name}" already exists for ${metal} ${purity}.`,
      );
    }
  }

  const stones =
    input.stones ??
    existingRow.stones.map((s) => ({
      stoneType: s.stoneType,
      qtyPerMotif: s.qtyPerMotif,
      sortOrder: s.sortOrder,
    }));

  const recalculate =
    input.stones !== undefined ||
    input.weightGrams !== undefined ||
    input.metal !== undefined ||
    input.purity !== undefined;

  const price = recalculate
    ? await calculateMotifPrice({
        weightGrams:
          input.weightGrams === undefined
            ? existingRow.weightGrams
            : input.weightGrams,
        metal,
        purity,
        stones,
        organizationId,
      })
    : input.price ?? undefined;

  await prisma.motif.update({
    where: { id },
    data: {
      name: input.name?.trim(),
      description: input.description,
      weightGrams: input.weightGrams,
      metal: input.metal,
      purity: input.purity,
      stone1: input.stone1,
      stone2: input.stone2,
      stone3: input.stone3,
      subCategory: input.subCategory,
      makingCost: input.makingCost,
      price,
      imageUrl: input.imageUrl,
    },
  });

  if (input.stones) {
    await syncMotifStones(id, input.stones);
  }

  const full = await prisma.motif.findUnique({
    where: { id },
    include: motifInclude,
  });
  const updated = toMotif(full!);

  if (actor) {
    await safeRecordCatalogAudit({
      entityType: "Motif",
      entityId: id,
      entityRef: updated.name,
      action: "Update",
      previousValue: motifSummary(existing),
      newValue: motifSummary(updated),
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  return updated;
};

export const deleteMotif = async (
  id: string,
  actor?: Actor,
): Promise<void> => {
  const existingRow = await prisma.motif.findUnique({
    where: { id },
    include: { ...motifInclude, designElements: { take: 1 } },
  });
  if (!existingRow) throw new MotifError("Motif not found.", 404);
  if (existingRow.designElements.length > 0) {
    throw new MotifError(
      "Cannot delete a motif referenced by design elements.",
    );
  }

  const existing = toMotif(existingRow);
  await prisma.motif.delete({ where: { id } });

  if (actor) {
    await safeRecordCatalogAudit({
      entityType: "Motif",
      entityId: id,
      entityRef: existing.name,
      action: "Delete",
      previousValue: motifSummary(existing),
      performedById: actor.id,
      performedByName: actor.name,
    });
  }
};

export const recalculateMotifPriceById = async (
  motifId: string,
  organizationId: string,
  actor?: Actor,
  reason?: string,
): Promise<number> => {
  const existingRow = await prisma.motif.findUnique({
    where: { id: motifId },
    include: motifInclude,
  });
  if (!existingRow) throw new MotifError("Motif not found.", 404);
  const before = toMotif(existingRow);

  const stones = motifStonesFromRow(existingRow);

  const price = await calculateMotifPrice({
    weightGrams: existingRow.weightGrams,
    metal: existingRow.metal as MotifMetal,
    purity: existingRow.purity as Purity,
    stones,
    organizationId,
  });
  await prisma.motif.update({
    where: { id: motifId },
    data: { price },
  });

  if (actor && Math.abs((before.price ?? 0) - price) >= 0.0001) {
    const after = { ...motifSummary(before), price };
    await safeRecordCatalogAudit({
      entityType: "Motif",
      entityId: motifId,
      entityRef: before.name,
      action: "Update",
      previousValue: motifSummary(before),
      newValue: after,
      reason: reason ?? "Price recalculated from current market rates",
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  return price;
};

export const recalculateMotifsForStoneType = async (
  stoneType: string,
  organizationId: string,
  actor?: Actor,
  reason?: string,
): Promise<number> => {
  const links = await prisma.motifStone.findMany({
    where: {
      stoneType: { equals: stoneType, mode: "insensitive" },
      motif: { branch: { organizationId } },
    },
    select: { motifId: true },
    distinct: ["motifId"],
  });

  let updated = 0;
  for (const { motifId } of links) {
    await recalculateMotifPriceById(motifId, organizationId, actor, reason);
    updated += 1;
  }
  return updated;
};

export const recalculateAllMotifPrices = async (
  organizationId?: string,
  reason?: string,
  actor?: Actor,
): Promise<number> => {
  const orgIds = organizationId
    ? [organizationId]
    : (
        await prisma.organization.findMany({
          where: { active: true },
          select: { id: true },
        })
      ).map((o) => o.id);

  let updated = 0;
  for (const orgId of orgIds) {
    const motifs = await prisma.motif.findMany({
      where: { branch: { organizationId: orgId } },
      select: { id: true },
    });
    for (const { id } of motifs) {
      await recalculateMotifPriceById(id, orgId, actor, reason);
      updated += 1;
    }
  }
  return updated;
};
