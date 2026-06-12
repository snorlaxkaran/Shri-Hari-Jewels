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

const nextSequence = (existing: string[], prefix: string): string => {
  const pattern = new RegExp(`^${prefix}-${yearSuffix()}-(\\d+)$`);
  const max = existing.reduce((acc, value) => {
    const match = value.match(pattern);
    if (!match) return acc;
    return Math.max(acc, parseInt(match[1], 10));
  }, 0);
  return String(max + 1).padStart(4, "0");
};

export const generateMetalLotNumber = (
  metalType: string,
  existing: string[],
): string => {
  const prefix = METAL_PREFIX[metalType] ?? "MTL";
  const seq = nextSequence(existing, `${prefix}-${yearSuffix()}`);
  return `${prefix}-${yearSuffix()}-${seq}`;
};

export const generateStoneCertificateNumber = (
  stoneType: string,
  existing: string[],
): string => {
  const prefix = STONE_PREFIX[stoneType] ?? "STN";
  const seq = nextSequence(existing, `${prefix}-${yearSuffix()}`);
  return `${prefix}-${yearSuffix()}-${seq}`;
};
