export const MOTIF_METALS = ["Silver", "Gold", "Platinum"] as const;

export const MOTIF_PURITIES = ["24K", "22K", "18K", "14K", "925"] as const;

export const MOTIF_STONE_TYPES = [
  "Glass",
  "Enamel",
  "Pearl",
  "Zircon",
  "Turquoise",
  "Black Onyx",
  "Emerald",
] as const;

export const MOTIF_SUB_CATEGORIES = [
  "Contemporary",
  "Traditional",
  "Tribal",
  "Bridal",
] as const;

export const MOTIF_EXCEL_HEADERS = [
  "Motif Metal",
  "Purity",
  "Motif Name",
  "Desc",
  "Price",
  "Motif Weight",
  "Stone1",
  "Stone2",
  "Stone3",
  "Subcategory",
  "ImageFile",
] as const;

export type MotifExcelRow = {
  metal: string;
  purity: string;
  name: string;
  description: string;
  price: number | undefined;
  weightGrams: number | undefined;
  stone1: string;
  stone2: string;
  stone3: string;
  subCategory: string;
  imageFile: string;
};

const normalizeHeader = (value: string) =>
  value.trim().toLowerCase().replace(/\s+/g, " ");

const headerAliases: Record<string, keyof MotifExcelRow | "skip"> = {
  "motif metal": "metal",
  purity: "purity",
  "motif name": "name",
  desc: "description",
  description: "description",
  price: "price",
  "motif weight": "weightGrams",
  weight: "weightGrams",
  stone1: "stone1",
  stone2: "stone2",
  stone3: "stone3",
  subcategory: "subCategory",
  "sub category": "subCategory",
  imagefile: "imageFile",
  image: "imageFile",
};

export const isValidMotifPurityForMetal = (
  metal: string,
  purity: string,
): boolean => {
  if (!MOTIF_PURITIES.includes(purity as (typeof MOTIF_PURITIES)[number])) {
    return false;
  }
  if (metal === "Silver") return purity === "925";
  if (metal === "Gold" || metal === "Platinum") {
    return purity !== "925";
  }
  return false;
};

export const mapExcelRows = (
  rows: Record<string, unknown>[],
): { rows: MotifExcelRow[]; errors: string[] } => {
  const parsed: MotifExcelRow[] = [];
  const errors: string[] = [];

  rows.forEach((raw, index) => {
    const row: Partial<MotifExcelRow> = {
      metal: "",
      purity: "",
      name: "",
      description: "",
      stone1: "",
      stone2: "",
      stone3: "",
      subCategory: "",
      imageFile: "",
    };

    for (const [key, value] of Object.entries(raw)) {
      const mapped = headerAliases[normalizeHeader(key)];
      if (!mapped || mapped === "skip") continue;
      const text = value == null ? "" : String(value).trim();
      if (mapped === "price" || mapped === "weightGrams") {
        if (text === "") continue;
        const num = Number(text);
        if (Number.isNaN(num)) {
          errors.push(`Row ${index + 2}: invalid ${mapped}.`);
        } else {
          row[mapped] = num;
        }
      } else {
        row[mapped] = text;
      }
    }

    if (!row.name?.trim()) {
      if (row.metal || row.description) {
        errors.push(`Row ${index + 2}: Motif Name is required.`);
      }
      return;
    }

    parsed.push(row as MotifExcelRow);
  });

  return { rows: parsed, errors };
};

export const validateMotifExcelRow = (
  row: MotifExcelRow,
  rowNumber: number,
): string[] => {
  const issues: string[] = [];
  if (!MOTIF_METALS.includes(row.metal as (typeof MOTIF_METALS)[number])) {
    issues.push(`Row ${rowNumber}: invalid Motif Metal "${row.metal}".`);
  }
  if (!row.purity.trim()) {
    issues.push(`Row ${rowNumber}: Purity is required.`);
  } else if (
    !isValidMotifPurityForMetal(row.metal, row.purity.trim())
  ) {
    issues.push(
      `Row ${rowNumber}: invalid Purity "${row.purity}" for metal "${row.metal}".`,
    );
  }
  if (
    !MOTIF_SUB_CATEGORIES.includes(
      row.subCategory as (typeof MOTIF_SUB_CATEGORIES)[number],
    )
  ) {
    issues.push(`Row ${rowNumber}: invalid Subcategory "${row.subCategory}".`);
  }
  for (const stone of [row.stone1, row.stone2, row.stone3]) {
    if (
      stone &&
      !MOTIF_STONE_TYPES.includes(stone as (typeof MOTIF_STONE_TYPES)[number])
    ) {
      issues.push(`Row ${rowNumber}: invalid stone "${stone}".`);
    }
  }
  return issues;
};

/** Map design metal to motif library metal for filtering. */
export const designMetalToMotifMetal = (
  metal: string,
): (typeof MOTIF_METALS)[number] | null => {
  if (metal === "Gold" || metal === "Rose Gold") return "Gold";
  if (metal === "Silver") return "Silver";
  if (metal === "Platinum") return "Platinum";
  return null;
};

export const puritiesForMotifMetal = (
  metal: (typeof MOTIF_METALS)[number],
): (typeof MOTIF_PURITIES)[number][] => {
  if (metal === "Silver") return ["925"];
  return ["24K", "22K", "18K", "14K"];
};
