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
import {
  isValidDesignMetal,
  isValidDesignPurity,
} from "./validation.js";

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

const designInclude = {
  elements: { orderBy: { sortOrder: "asc" as const } },
};

const toDesignElement = (element: {
  id: string;
  designId: string;
  name: string;
  type: string;
  qtyPerSet: number;
  unitValue: { toString(): string } | null;
  weightGramsPerPc: number | null;
  sortOrder: number;
}): DesignElement => ({
  id: element.id,
  designId: element.designId,
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
  createdAt: Date;
  updatedAt: Date;
  elements?: Array<{
    id: string;
    designId: string;
    name: string;
    type: string;
    qtyPerSet: number;
    unitValue: { toString(): string } | null;
    weightGramsPerPc: number | null;
    sortOrder: number;
  }>;
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
  elements: (design.elements ?? []).map(toDesignElement),
  createdAt: design.createdAt.toISOString(),
  updatedAt: design.updatedAt.toISOString(),
});

export const listDesigns = async (): Promise<Design[]> => {
  const designs = await prisma.design.findMany({
    include: designInclude,
    orderBy: { code: "asc" },
  });
  return designs.map(toDesign);
};

export const createDesign = async (
  input: NewDesignInput,
  branchId: string,
): Promise<Design> => {
  const code = input.code?.trim().toUpperCase();
  if (!code) throw new DesignError("Design code is required.");

  const existing = await prisma.design.findUnique({ where: { code } });
  if (existing) throw new DesignError("A design with this code already exists.");

  if (input.category && !DESIGN_CATEGORIES.includes(input.category)) {
    throw new DesignError("Invalid design category.");
  }

  const elements = input.elements ?? [];
  for (const el of elements) {
    validateElementInput(el.name, el.type, el.qtyPerSet, el.unitValue, el.weightGramsPerPc);
  }

  const design = await prisma.design.create({
    data: {
      branchId,
      code,
      name: input.name?.trim() || null,
      category: input.category || null,
      elements: {
        create: elements.map((el, index) => ({
          name: el.name.trim(),
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

  return toDesign(design);
};

export const updateDesign = async (
  id: string,
  input: UpdateDesignInput,
): Promise<Design> => {
  const existing = await prisma.design.findUnique({ where: { id } });
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

  return toDesign(design);
};

export const deleteDesign = async (id: string): Promise<void> => {
  const existing = await prisma.design.findUnique({
    where: { id },
    include: { productionRuns: { take: 1 } },
  });
  if (!existing) throw new DesignError("Design not found.", 404);
  if (existing.productionRuns.length > 0) {
    throw new DesignError(
      "Cannot delete a design that has production runs. Remove runs first.",
    );
  }

  await prisma.design.delete({ where: { id } });
};

export const addDesignElement = async (
  designId: string,
  input: NewDesignElementInput,
): Promise<Design> => {
  const design = await prisma.design.findUnique({ where: { id: designId } });
  if (!design) throw new DesignError("Design not found.", 404);

  validateElementInput(
    input.name,
    input.type,
    input.qtyPerSet,
    input.unitValue,
    input.weightGramsPerPc,
  );

  const maxSort = await prisma.designElement.aggregate({
    where: { designId },
    _max: { sortOrder: true },
  });

  await prisma.designElement.create({
    data: {
      designId,
      name: input.name.trim(),
      type: input.type,
      qtyPerSet: input.qtyPerSet,
      unitValue: input.unitValue,
      weightGramsPerPc: input.weightGramsPerPc,
      sortOrder: input.sortOrder ?? (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

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
): Promise<Design> => {
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

  await prisma.designElement.update({
    where: { id: elementId },
    data: {
      name: input.name?.trim(),
      type: input.type,
      qtyPerSet: input.qtyPerSet,
      unitValue:
        input.unitValue === undefined ? undefined : input.unitValue,
      weightGramsPerPc:
        input.weightGramsPerPc === undefined
          ? undefined
          : input.weightGramsPerPc,
      sortOrder: input.sortOrder,
    },
  });

  const updated = await prisma.design.findUnique({
    where: { id: designId },
    include: designInclude,
  });

  return toDesign(updated!);
};

export const deleteDesignElement = async (
  designId: string,
  elementId: string,
): Promise<Design> => {
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

  const updated = await prisma.design.findUnique({
    where: { id: designId },
    include: designInclude,
  });

  return toDesign(updated!);
};

const validateElementInput = (
  name: string | undefined,
  type: DesignElementType | undefined,
  qtyPerSet: number | undefined,
  unitValue?: number | null,
  weightGramsPerPc?: number | null,
) => {
  if (!name?.trim()) throw new DesignError("Element name is required.");
  if (!type || !DESIGN_ELEMENT_TYPES.includes(type)) {
    throw new DesignError("Invalid element type.");
  }
  if (qtyPerSet === undefined || qtyPerSet < 1) {
    throw new DesignError("Quantity per set must be at least 1.");
  }
  if (unitValue != null && unitValue < 0) {
    throw new DesignError("Unit value cannot be negative.");
  }
  if (weightGramsPerPc != null && weightGramsPerPc < 0) {
    throw new DesignError("Weight per piece cannot be negative.");
  }
};
