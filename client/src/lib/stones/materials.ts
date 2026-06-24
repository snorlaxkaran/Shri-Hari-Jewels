export const STONE_MATERIALS = [
  "Abalone", "Agate", "Amber", "Amethyst", "Amethyst Jade", "Amezonite",
  "Apatite", "Aqua", "Aqua Jade", "Aqua Onyx", "Aquamarine", "Aventurine",
  "Bear Qtz", "Black Onyx", "Blue Jade", "Blue Lees", "Blue Onyx",
  "Blue Rose Agate", "Blue Sand Stone", "Blue Sapphire", "Blue Topaz",
  "Carnelian", "Cat's Eye", "Chalcedony", "Chrysophase", "Chrysoprase Onyx",
  "Citrine", "Colour Zircon", "Coral", "Crystal",
  "Diamond (Full Cut)", "Diamond", "Diapasite",
  "Died Blue Sapphire", "Died Emerald", "Died Ruby", "Died Sapphire",
  "Druzy", "Emerald", "Enamel", "Florite", "Garnet", "Glass",
  "Green Amethyst", "Green CZ", "Green Jade", "Green Onyx",
  "Hassonite", "Howlite", "Iolite", "Jesper", "Kyanite",
  "Labradorite", "Labro", "Lapis", "Lemon Qtz", "Lemon Topaz",
  "Marcasite", "Melakite", "Moon Stone", "Multi Stone", "Multi Tourmaline",
  "Navrathan", "Onyx", "Opal", "Painite", "Painting", "Pearl",
  "Peridot", "Phrenite", "Pink Jade", "Pink Sapphire", "Pink Tourmaline",
  "Plain", "Polki", "Prehnite", "Pyrite", "Rainbow Moonstone",
  "Red Jade", "Red Onyx", "Rhodolite", "Rose Qtz", "Rosecut Diamond",
  "Rotile", "Ruby", "Ruby Jade", "Rudraksha", "Saffron Jade", "Shell",
  "Smoky", "Sodolite", "Spinel", "Sun Stone", "Swarovski",
  "Synthetic Emerald", "Synthetic Ruby", "Tanzanite", "Tiger's Eye",
  "Topaz", "Tourmaline", "Turquoise", "White Sapphire", "Yellow Sapphire",
  "Zircon",
] as const;

export type StoneMaterial = (typeof STONE_MATERIALS)[number];

export const STONE_CATEGORIES = [
  { value: "CZ", label: "CZ" },
  { value: "Diamond", label: "Diamond" },
  { value: "Precious", label: "Precious" },
  { value: "SemiPrecious", label: "Semi-Precious" },
] as const;

export const STONE_ORIGIN_TYPES = [
  { value: "Natural", label: "Natural" },
  { value: "LabGrown", label: "Lab Grown" },
  { value: "Synthetic", label: "Synthetic" },
] as const;

export const STONE_SHAPES = [
  "Round", "Oval", "Pear", "Princess", "Cushion", "Emerald", "Marquise",
  "Heart", "Baguette", "Trillion", "Asscher", "Radiant", "Hexagon", "Octagon", "Cabochon",
] as const;

export const STONE_UOMS = [
  { value: "Pcs", label: "Pcs" },
  { value: "Carat", label: "Carat" },
] as const;

export const formatStoneMasterLabel = (stone: {
  stoneCode: string;
  stoneName: string;
  sizeMm: string;
  shape: string;
  clarityGrade?: string;
}): string => {
  const parts = [
    stone.stoneCode,
    stone.stoneName,
    stone.sizeMm,
    stone.shape,
    stone.clarityGrade,
  ].filter(Boolean);
  return parts.join(" — ");
};
