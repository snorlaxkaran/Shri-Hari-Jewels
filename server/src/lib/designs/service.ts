import { prisma } from "../db.js";
import { moneyToNumber } from "../money.js";
import type {
  Design,
  DesignCategory,
  DesignElement,
  DesignElementType,
  NewDesignElementInput,
  NewDesignInput,
  UpdateDesignElementInput,
  UpdateDesignInput,
} from "../../types.js";
import { safeRecordCatalogAudit } from "../catalog/audit.js";
import { organizationBranchFilter } from "../branches/access.js";
import { getMotif } from "../motifs/service.js";
import {
  isValidDesignMetal,
  isValidDesignPurity,
} from "./validation.js";
import { toApiDesignBuilderStage } from "./builder-stages.js";

export const DESIGN_CATEGORIES: DesignCategory[] = [
  "Necklace",
  "Earring",
  "Ring",
  "Bracelet",
  "Pendant",
  "Bangle",
  "Other",
];

export const DESIGN_ELEMENT_TYPES: DesignElementType[] = [
  "Motif",
  "Stone",
  "Casting",
];

export class DesignError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "DesignError";
  }
}

type Actor = { id: string; name: string };

const designInclude = {
  elements: { orderBy: { sortOrder: "asc" as const } },
};

const toDesignElement = (element: {
  id: string;
  designId: string;
  motifId: string | null;
  name: string;
  type: string;
  qtyPerSet: number;
  unitValue: { toString(): string } | null;
  weightGramsPerPc: number | null;
  sortOrder: number;
}): DesignElement => ({
  id: element.id,
  designId: element.designId,
  motifId: element.motifId ?? undefined,
  name: element.name,
  type: element.type as DesignElementType,
  qtyPerSet: element.qtyPerSet,
  unitValue:
    element.unitValue != null
      ? moneyToNumber(String(element.unitValue))
      : undefined,
  weightGramsPerPc: element.weightGramsPerPc ?? undefined,
  sortOrder: element.sortOrder,
});

const toDesign = (design: {
  id: string;
  code: string;
  name: string | null;
  category: string | null;
  metal: string | null;
  purity: string | null;
  makingChargesPerSet: { toString(): string } | null;
  builderStage: Parameters<typeof toApiDesignBuilderStage>[0];
  cadFileUrl: string | null;
  cadCompletedAt: Date | null;
  moldNotes: string | null;
  moldPhotoUrl: string | null;
  moldCompletedAt: Date | null;
  finishedPhotoUrl: string | null;
  finishedPhotoUrls: string[];
  builderCompletedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  elements?: Array<Parameters<typeof toDesignElement>[0]>;
}): Design => ({
  id: design.id,
  code: design.code,
  name: design.name ?? undefined,
  category: (design.category as DesignCategory) ?? undefined,
  metal: (design.metal as Design["metal"]) ?? undefined,
  purity: (design.purity as Design["purity"]) ?? undefined,
  makingChargesPerSet:
    design.makingChargesPerSet != null
      ? moneyToNumber(String(design.makingChargesPerSet))
      : undefined,
  builderStage: toApiDesignBuilderStage(design.builderStage),
  cadFileUrl: design.cadFileUrl ?? undefined,
  cadCompletedAt: design.cadCompletedAt?.toISOString(),
  moldNotes: design.moldNotes ?? undefined,
  moldPhotoUrl: design.moldPhotoUrl ?? undefined,
  moldCompletedAt: design.moldCompletedAt?.toISOString(),
  finishedPhotoUrl: design.finishedPhotoUrl ?? undefined,
  finishedPhotoUrls:
    design.finishedPhotoUrls.length > 0 ? design.finishedPhotoUrls : undefined,
  builderCompletedAt: design.builderCompletedAt?.toISOString(),
  elements: (design.elements ?? []).map(toDesignElement),
  createdAt: design.createdAt.toISOString(),
  updatedAt: design.updatedAt.toISOString(),
});

export { toDesign };

const resolveMotifSnapshot = async (
  motifId: string,
): Promise<{ name: string; unitValue: number; weightGramsPerPc?: number }> => {
  const motif = await getMotif(motifId);
  return {
    name: motif.name,
    unitValue: motif.price ?? 0,
    weightGramsPerPc: motif.weightGrams,
  };
};

const buildElementData = async (
  input: NewDesignElementInput,
): Promise<{
  motifId: string | null;
  name: string;
  type: DesignElementType;
  qtyPerSet: number;
  unitValue?: number;
  weightGramsPerPc?: number;
  sortOrder?: number;
}> => {
  if (input.motifId) {
    const snapshot = await resolveMotifSnapshot(input.motifId);
    return {
      motifId: input.motifId,
      name: snapshot.name,
      type: input.type,
      qtyPerSet: input.qtyPerSet,
      unitValue: input.unitValue ?? snapshot.unitValue,
      weightGramsPerPc: input.weightGramsPerPc ?? snapshot.weightGramsPerPc,
      sortOrder: input.sortOrder,
    };
  }

  return {
    motifId: null,
    name: input.name.trim(),
    type: input.type,
    qtyPerSet: input.qtyPerSet,
    unitValue: input.unitValue,
    weightGramsPerPc: input.weightGramsPerPc,
    sortOrder: input.sortOrder,
  };
};

export const listDesigns = async (
  organizationId: string,
  branchId?: string,
): Promise<Design[]> => {
  const designs = await prisma.design.findMany({
    where: organizationBranchFilter(organizationId, branchId),
    include: designInclude,
    orderBy: { code: "asc" },
  });
  return designs.map(toDesign);
};

export const createDesign = async (
  input: NewDesignInput,
  branchId: string,
  actor?: Actor,
): Promise<Design> => {
  const code = input.code?.trim().toUpperCase();
  if (!code) throw new DesignError("Design code is required.");

  const existing = await prisma.design.findUnique({ where: { code } });
  if (existing) throw new DesignError("A design with this code already exists.");

  if (input.category && !DESIGN_CATEGORIES.includes(input.category)) {
    throw new DesignError("Invalid design category.");
  }
  if (input.metal && !isValidDesignMetal(input.metal)) {
    throw new DesignError("Invalid metal.");
  }
  if (input.purity && !isValidDesignPurity(input.purity)) {
    throw new DesignError("Invalid purity.");
  }

  const elements = input.elements ?? [];
  for (const el of elements) {
    await validateElementInput(el);
  }

  const builtElements = await Promise.all(
    elements.map((el) => buildElementData(el)),
  );

  const design = await prisma.design.create({
    data: {
      branchId,
      code,
      name: input.name?.trim() || null,
      category: input.category || null,
      metal: input.metal || null,
      purity: input.purity || null,
      elements: {
        create: builtElements.map((el, index) => ({
          motifId: el.motifId,
          name: el.name,
          type: el.type,
          qtyPerSet: el.qtyPerSet,
          unitValue: el.unitValue,
          weightGramsPerPc: el.weightGramsPerPc,
          sortOrder: el.sortOrder ?? index,
        })),
      },
    },
    include: designInclude,
  });

  if (actor) {
    await safeRecordCatalogAudit({
      entityType: "Design",
      entityId: design.id,
      entityRef: design.code,
      action: "Create",
      newValue: toDesign(design),
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  return toDesign(design);
};

export const updateDesign = async (
  id: string,
  input: UpdateDesignInput,
  actor?: Actor,
): Promise<Design> => {
  const existing = await prisma.design.findUnique({
    where: { id },
    include: designInclude,
  });
  if (!existing) throw new DesignError("Design not found.", 404);

  if (input.category && !DESIGN_CATEGORIES.includes(input.category)) {
    throw new DesignError("Invalid design category.");
  }

  if (input.metal !== undefined && input.metal !== null && !isValidDesignMetal(input.metal)) {
    throw new DesignError("Invalid metal type.");
  }
  if (
    input.purity !== undefined &&
    input.purity !== null &&
    !isValidDesignPurity(input.purity)
  ) {
    throw new DesignError("Invalid purity.");
  }
  if (
    input.makingChargesPerSet !== undefined &&
    input.makingChargesPerSet !== null &&
    input.makingChargesPerSet < 0
  ) {
    throw new DesignError("Making charges cannot be negative.");
  }

  const design = await prisma.design.update({
    where: { id },
    data: {
      name: input.name === undefined ? undefined : input.name?.trim() || null,
      category:
        input.category === undefined ? undefined : input.category || null,
      metal: input.metal === undefined ? undefined : input.metal || null,
      purity: input.purity === undefined ? undefined : input.purity || null,
      makingChargesPerSet:
        input.makingChargesPerSet === undefined
          ? undefined
          : input.makingChargesPerSet,
    },
    include: designInclude,
  });

  if (actor) {
    await safeRecordCatalogAudit({
      entityType: "Design",
      entityId: design.id,
      entityRef: design.code,
      action: "Update",
      previousValue: toDesign(existing),
      newValue: toDesign(design),
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  return toDesign(design);
};

export const deleteDesign = async (
  id: string,
  actor?: Actor,
): Promise<void> => {
  const existing = await prisma.design.findUnique({
    where: { id },
    include: { ...designInclude, productionRuns: { take: 1 } },
  });
  if (!existing) throw new DesignError("Design not found.", 404);
  if (existing.productionRuns.length > 0) {
    throw new DesignError(
      "Cannot delete a design that has production runs. Remove runs first.",
    );
  }

  const snapshot = toDesign(existing);

  await prisma.design.delete({ where: { id } });

  if (actor) {
    await safeRecordCatalogAudit({
      entityType: "Design",
      entityId: id,
      entityRef: existing.code,
      action: "Delete",
      previousValue: snapshot,
      performedById: actor.id,
      performedByName: actor.name,
    });
  }
};

export const addDesignElement = async (
  designId: string,
  input: NewDesignElementInput,
  actor?: Actor,
): Promise<Design> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: designInclude,
  });
  if (!design) throw new DesignError("Design not found.", 404);

  await validateElementInput(input);
  const built = await buildElementData(input);

  const maxSort = await prisma.designElement.aggregate({
    where: { designId },
    _max: { sortOrder: true },
  });

  const element = await prisma.designElement.create({
    data: {
      designId,
      motifId: built.motifId,
      name: built.name,
      type: built.type,
      qtyPerSet: built.qtyPerSet,
      unitValue: built.unitValue,
      weightGramsPerPc: built.weightGramsPerPc,
      sortOrder: built.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  if (actor) {
    await safeRecordCatalogAudit({
      entityType: "DesignElement",
      entityId: element.id,
      entityRef: `${design.code} / ${element.name}`,
      action: "Create",
      newValue: toDesignElement(element),
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  const updated = await prisma.design.findUnique({
    where: { id: designId },
    include: designInclude,
  });

  return toDesign(updated!);
};

export const updateDesignElement = async (
  designId: string,
  elementId: string,
  input: UpdateDesignElementInput,
  actor?: Actor,
): Promise<Design> => {
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) throw new DesignError("Design not found.", 404);

  const element = await prisma.designElement.findFirst({
    where: { id: elementId, designId },
  });
  if (!element) throw new DesignError("Design element not found.", 404);

  if (input.type && !DESIGN_ELEMENT_TYPES.includes(input.type)) {
    throw new DesignError("Invalid element type.");
  }
  if (input.qtyPerSet !== undefined && input.qtyPerSet < 1) {
    throw new DesignError("Quantity per set must be at least 1.");
  }
  if (input.unitValue !== undefined && input.unitValue !== null && input.unitValue < 0) {
    throw new DesignError("Unit value cannot be negative.");
  }
  if (
    input.weightGramsPerPc !== undefined &&
    input.weightGramsPerPc !== null &&
    input.weightGramsPerPc < 0
  ) {
    throw new DesignError("Weight per piece cannot be negative.");
  }

  let motifId = input.motifId;
  let name = input.name?.trim();
  let unitValue = input.unitValue;
  let weightGramsPerPc = input.weightGramsPerPc;

  if (input.motifId) {
    const snapshot = await resolveMotifSnapshot(input.motifId);
    name = snapshot.name;
    if (input.unitValue === undefined) unitValue = snapshot.unitValue;
    if (input.weightGramsPerPc === undefined) {
      weightGramsPerPc = snapshot.weightGramsPerPc;
    }
  }

  const updatedElement = await prisma.designElement.update({
    where: { id: elementId },
    data: {
      motifId: motifId === undefined ? undefined : motifId,
      name,
      type: input.type,
      qtyPerSet: input.qtyPerSet,
      unitValue: unitValue === undefined ? undefined : unitValue,
      weightGramsPerPc:
        weightGramsPerPc === undefined ? undefined : weightGramsPerPc,
      sortOrder: input.sortOrder,
    },
  });

  if (actor) {
    await safeRecordCatalogAudit({
      entityType: "DesignElement",
      entityId: elementId,
      entityRef: `${design.code} / ${updatedElement.name}`,
      action: "Update",
      previousValue: toDesignElement(element),
      newValue: toDesignElement(updatedElement),
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  const updated = await prisma.design.findUnique({
    where: { id: designId },
    include: designInclude,
  });

  return toDesign(updated!);
};

export const deleteDesignElement = async (
  designId: string,
  elementId: string,
  actor?: Actor,
): Promise<Design> => {
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) throw new DesignError("Design not found.", 404);

  const element = await prisma.designElement.findFirst({
    where: { id: elementId, designId },
  });
  if (!element) throw new DesignError("Design element not found.", 404);

  const elementCount = await prisma.designElement.count({ where: { designId } });
  if (elementCount <= 1) {
    throw new DesignError(
      "Design must have at least one element. Add a motif or component before removing the last one.",
    );
  }

  await prisma.designElement.delete({ where: { id: elementId } });

  if (actor) {
    await safeRecordCatalogAudit({
      entityType: "DesignElement",
      entityId: elementId,
      entityRef: `${design.code} / ${element.name}`,
      action: "Delete",
      previousValue: toDesignElement(element),
      performedById: actor.id,
      performedByName: actor.name,
    });
  }

  const updated = await prisma.design.findUnique({
    where: { id: designId },
    include: designInclude,
  });

  return toDesign(updated!);
};

export const replaceDesignElements = async (
  designId: string,
  elements: NewDesignElementInput[],
  actor: Actor,
  reason?: string,
): Promise<Design> => {
  const design = await prisma.design.findUnique({
    where: { id: designId },
    include: designInclude,
  });
  if (!design) throw new DesignError("Design not found.", 404);
  if (elements.length === 0) {
    throw new DesignError("At least one element is required.");
  }

  for (const el of elements) {
    await validateElementInput(el);
  }

  const builtElements = await Promise.all(
    elements.map((el) => buildElementData(el)),
  );

  const previousElements = design.elements.map(toDesignElement);

  await prisma.$transaction(async (tx) => {
    await tx.designElement.deleteMany({ where: { designId } });
    await tx.designElement.createMany({
      data: builtElements.map((el, index) => ({
        designId,
        motifId: el.motifId,
        name: el.name,
        type: el.type,
        qtyPerSet: el.qtyPerSet,
        unitValue: el.unitValue,
        weightGramsPerPc: el.weightGramsPerPc,
        sortOrder: el.sortOrder ?? index,
      })),
    });
  });

  const updated = await prisma.design.findUnique({
    where: { id: designId },
    include: designInclude,
  });

  await safeRecordCatalogAudit({
    entityType: "Design",
    entityId: designId,
    entityRef: design.code,
    action: "ReplaceElements",
    previousValue: previousElements,
    newValue: updated!.elements.map(toDesignElement),
    reason,
    performedById: actor.id,
    performedByName: actor.name,
  });

  return toDesign(updated!);
};

const validateElementInput = async (input: NewDesignElementInput) => {
  if (input.motifId) {
    if (input.type !== "Motif") {
      throw new DesignError("motifId is only valid for Motif element type.");
    }
    await getMotif(input.motifId);
    if (input.qtyPerSet === undefined || input.qtyPerSet < 1) {
      throw new DesignError("Quantity per set must be at least 1.");
    }
    return;
  }

  if (!input.name?.trim()) throw new DesignError("Element name is required.");
  if (!input.type || !DESIGN_ELEMENT_TYPES.includes(input.type)) {
    throw new DesignError("Invalid element type.");
  }
  if (input.qtyPerSet === undefined || input.qtyPerSet < 1) {
    throw new DesignError("Quantity per set must be at least 1.");
  }
  if (input.unitValue != null && input.unitValue < 0) {
    throw new DesignError("Unit value cannot be negative.");
  }
  if (input.weightGramsPerPc != null && input.weightGramsPerPc < 0) {
    throw new DesignError("Weight per piece cannot be negative.");
  }
};

export const computeDesignElementDiff = (
  current: DesignElement[],
  target: NewDesignElementInput[],
): {
  added: NewDesignElementInput[];
  removed: DesignElement[];
  changed: Array<{ before: DesignElement; after: NewDesignElementInput }>;
} => {
  const elementKey = (type: string, name: string, motifId?: string) =>
    motifId ? `motif:${motifId}` : `${type}::${name}`;

  const currentMap = new Map(
    current.map((e) => [
      elementKey(e.type, e.name, e.motifId),
      e,
    ]),
  );
  const targetMap = new Map(
    target.map((t) => [
      elementKey(t.type, t.name, t.motifId),
      t,
    ]),
  );

  const added: NewDesignElementInput[] = [];
  const removed: DesignElement[] = [];
  const changed: Array<{ before: DesignElement; after: NewDesignElementInput }> = [];

  for (const [key, t] of targetMap) {
    const existing = currentMap.get(key);
    if (!existing) {
      added.push(t);
    } else if (
      existing.qtyPerSet !== t.qtyPerSet ||
      existing.unitValue !== t.unitValue ||
      existing.weightGramsPerPc !== t.weightGramsPerPc
    ) {
      changed.push({ before: existing, after: t });
    }
  }

  for (const [key, e] of currentMap) {
    if (!targetMap.has(key)) removed.push(e);
  }

  return { added, removed, changed };
};
