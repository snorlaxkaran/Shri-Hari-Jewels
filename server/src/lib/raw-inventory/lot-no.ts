const METAL_PREFIX: Record<string, string> = {
  Gold: "GLD",
  Silver: "SLV",
  Platinum: "PLT",
};

const STONE_PREFIX: Record<string, string> = {
  Diamond: "DMD",
  Precious: "PRC",
  SemiPrecious: "SMP",
};

const yearSuffix = () => String(new Date().getFullYear()).slice(-2);

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Legacy seed data used `GL-` for gold lots before `GLD-`. */
const metalLotPrefixesForType = (metalType: string, year: string): string[] => {
  const primary = METAL_PREFIX[metalType] ?? "MTL";
  if (metalType === "Gold" && primary !== "GL") {
    return [`${primary}-${year}`, `GL-${year}`];
  }
  return [`${primary}-${year}`];
};

const nextSequence = (existing: string[], prefixes: string[]): string => {
  let max = 0;
  for (const lotNumber of existing) {
    for (const prefix of prefixes) {
      const pattern = new RegExp(`^${escapeRegex(prefix)}-(\\d+)$`);
      const match = lotNumber.match(pattern);
      if (match) {
        max = Math.max(max, Number.parseInt(match[1]!, 10));
      }
    }
  }
  return String(max + 1).padStart(4, "0");
};

export const generateMetalLotNumber = (
  metalType: string,
  existing: string[],
): string => {
  const prefix = METAL_PREFIX[metalType] ?? "MTL";
  const year = yearSuffix();
  const prefixes = metalLotPrefixesForType(metalType, year);
  const seq = nextSequence(existing, prefixes);
  return `${prefix}-${year}-${seq}`;
};

export const generateStoneCertificateNumber = (
  stoneType: string,
  existing: string[],
): string => {
  const prefix = STONE_PREFIX[stoneType] ?? "STN";
  const year = yearSuffix();
  const seq = nextSequence(existing, [`${prefix}-${year}`]);
  return `${prefix}-${year}-${seq}`;
};
