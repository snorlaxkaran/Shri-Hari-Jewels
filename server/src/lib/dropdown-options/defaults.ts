/** Default dropdown values seeded per organization on first access. */
export const DROPDOWN_OPTION_DEFAULTS: Record<string, readonly string[]> = {
  metal: ["Gold", "Silver", "Base Metal", "Platinum", "Rose Gold"],
  purity: ["24K", "22K", "18K", "14K", "925"],
  subCategory: ["Plain", "Silver Plated", "Gold Plated", "Enamel", "Studded", "Other"],
  "categorySize:Rings": Array.from({ length: 24 }, (_, index) => String(index + 4)),
  "categorySize:Bangles": Array.from({ length: 9 }, (_, index) => `2|${index + 2}`),
};

/** Fields staff may add inline from stock entry (low-risk, frequently changing). */
export const INLINE_ADDABLE_FIELD_KEYS = new Set(["subCategory"]);

export const ADMIN_MANAGED_FIELD_KEYS = Object.keys(DROPDOWN_OPTION_DEFAULTS);

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
