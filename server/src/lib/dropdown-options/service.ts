import { prisma } from "../db.js";
import {
  DROPDOWN_OPTION_DEFAULTS,
  INLINE_ADDABLE_FIELD_KEYS,
} from "./defaults.js";
import type {
  DropdownOption,
  NewDropdownOptionInput,
  ReorderDropdownOptionsInput,
  UpdateDropdownOptionInput,
} from "../../types.js";

export class DropdownOptionError extends Error {
  constructor(
    message: string,
    readonly statusCode: number = 400,
  ) {
    super(message);
    this.name = "DropdownOptionError";
  }
}

const toDropdownOption = (row: {
  id: string;
  organizationId: string;
  fieldKey: string;
  value: string;
  sortOrder: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}): DropdownOption => ({
  id: row.id,
  organizationId: row.organizationId,
  fieldKey: row.fieldKey,
  value: row.value,
  sortOrder: row.sortOrder,
  active: row.active,
  createdAt: row.createdAt.toISOString(),
  updatedAt: row.updatedAt.toISOString(),
});

export const ensureDefaultDropdownOptions = async (
  organizationId: string,
): Promise<void> => {
  const existing = await prisma.dropdownOption.count({ where: { organizationId } });
  if (existing > 0) return;

  const data = Object.entries(DROPDOWN_OPTION_DEFAULTS).flatMap(([fieldKey, values]) =>
    values.map((value, index) => ({
      organizationId,
      fieldKey,
      value,
      sortOrder: index,
    })),
  );

  await prisma.dropdownOption.createMany({
    data,
    skipDuplicates: true,
  });
};

export const listDropdownOptions = async (
  organizationId: string,
  options: { fieldKey?: string; activeOnly?: boolean } = {},
): Promise<DropdownOption[]> => {
  await ensureDefaultDropdownOptions(organizationId);

  const rows = await prisma.dropdownOption.findMany({
    where: {
      organizationId,
      ...(options.fieldKey ? { fieldKey: options.fieldKey } : {}),
      ...(options.activeOnly === false ? {} : { active: true }),
    },
    orderBy: [{ fieldKey: "asc" }, { sortOrder: "asc" }, { value: "asc" }],
  });

  return rows.map(toDropdownOption);
};

export const createDropdownOption = async (
  organizationId: string,
  input: NewDropdownOptionInput,
): Promise<DropdownOption> => {
  const fieldKey = input.fieldKey?.trim();
  const value = input.value?.trim();
  if (!fieldKey) throw new DropdownOptionError("fieldKey is required.");
  if (!value) throw new DropdownOptionError("value is required.");

  await ensureDefaultDropdownOptions(organizationId);

  const existing = await prisma.dropdownOption.findFirst({
    where: {
      organizationId,
      fieldKey,
      value: { equals: value, mode: "insensitive" },
    },
  });

  if (existing) {
    if (!existing.active) {
      const revived = await prisma.dropdownOption.update({
        where: { id: existing.id },
        data: { active: true },
      });
      return toDropdownOption(revived);
    }
    throw new DropdownOptionError(`"${value}" already exists for ${fieldKey}.`);
  }

  const maxSort = await prisma.dropdownOption.aggregate({
    where: { organizationId, fieldKey },
    _max: { sortOrder: true },
  });

  const created = await prisma.dropdownOption.create({
    data: {
      organizationId,
      fieldKey,
      value,
      sortOrder: (maxSort._max.sortOrder ?? -1) + 1,
    },
  });

  return toDropdownOption(created);
};

export const canCreateDropdownOptionInline = (fieldKey: string): boolean =>
  INLINE_ADDABLE_FIELD_KEYS.has(fieldKey);

export const updateDropdownOption = async (
  organizationId: string,
  id: string,
  input: UpdateDropdownOptionInput,
): Promise<DropdownOption> => {
  const existing = await prisma.dropdownOption.findFirst({
    where: { id, organizationId },
  });
  if (!existing) throw new DropdownOptionError("Dropdown option not found.", 404);

  const updated = await prisma.dropdownOption.update({
    where: { id },
    data: {
      ...(input.active !== undefined ? { active: input.active } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}),
    },
  });

  return toDropdownOption(updated);
};

export const reorderDropdownOptions = async (
  organizationId: string,
  input: ReorderDropdownOptionsInput,
): Promise<DropdownOption[]> => {
  const fieldKey = input.fieldKey?.trim();
  if (!fieldKey) throw new DropdownOptionError("fieldKey is required.");
  if (!Array.isArray(input.orderedIds) || input.orderedIds.length === 0) {
    throw new DropdownOptionError("orderedIds must be a non-empty array.");
  }

  const rows = await prisma.dropdownOption.findMany({
    where: { organizationId, fieldKey },
  });
  const rowIds = new Set(rows.map((row) => row.id));
  if (input.orderedIds.some((id) => !rowIds.has(id))) {
    throw new DropdownOptionError("orderedIds contains unknown option ids.");
  }

  await prisma.$transaction(
    input.orderedIds.map((id, index) =>
      prisma.dropdownOption.update({
        where: { id },
        data: { sortOrder: index },
      }),
    ),
  );

  return listDropdownOptions(organizationId, { fieldKey, activeOnly: false });
};
