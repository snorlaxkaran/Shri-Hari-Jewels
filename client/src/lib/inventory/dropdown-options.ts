import type { DropdownOption } from "@/lib/types";

export const DROPDOWN_FIELD_KEYS = {
  metal: "metal",
  purity: "purity",
  subCategory: "subCategory",
} as const;

export const categorySizeFieldKey = (category: string): string =>
  `categorySize:${category}`;

export const groupDropdownOptions = (
  options: DropdownOption[],
): Map<string, DropdownOption[]> => {
  const grouped = new Map<string, DropdownOption[]>();
  for (const option of options) {
    const list = grouped.get(option.fieldKey) ?? [];
    list.push(option);
    grouped.set(option.fieldKey, list);
  }
  for (const [fieldKey, list] of grouped) {
    grouped.set(
      fieldKey,
      [...list].sort(
        (a, b) => a.sortOrder - b.sortOrder || a.value.localeCompare(b.value),
      ),
    );
  }
  return grouped;
};

export const getDropdownValues = (
  grouped: Map<string, DropdownOption[]>,
  fieldKey: string,
): string[] => (grouped.get(fieldKey) ?? []).map((option) => option.value);

export const ADMIN_DROPDOWN_FIELD_KEYS = [
  "metal",
  "purity",
  "subCategory",
  "categorySize:Rings",
  "categorySize:Bangles",
] as const;

export const dropdownFieldKeyLabel = (fieldKey: string): string => {
  if (fieldKey.startsWith("categorySize:")) {
    return `${fieldKey.slice("categorySize:".length)} sizes`;
  }
  switch (fieldKey) {
    case "metal":
      return "Metal types";
    case "purity":
      return "Purity grades";
    case "subCategory":
      return "Sub categories";
    default:
      return fieldKey;
  }
};
