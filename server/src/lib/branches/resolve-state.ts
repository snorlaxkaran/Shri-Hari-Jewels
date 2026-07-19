type BranchLike = {
  id: string;
  name?: string | null;
  address?: string | null;
};

const normalizeStateLabel = (value: string): string => {
  const trimmed = value.trim();
  const lower = trimmed.toLowerCase();
  if (lower === "new delhi" || lower === "delhi ncr") return "Delhi";
  if (lower.includes("jammu") && lower.includes("kashmir")) return "Jammu & Kashmir";
  return trimmed;
};

const stateFromBranchText = (text: string): string | null => {
  const lower = text.toLowerCase();
  if (lower.includes("delhi")) return "Delhi";
  if (lower.includes("jaipur") || lower.includes("rajasthan")) return "Rajasthan";
  if (
    lower.includes("mumbai") ||
    lower.includes("maharashtra") ||
    lower.includes("pune")
  ) {
    return "Maharashtra";
  }
  if (lower.includes("jammu") || lower.includes("kashmir")) return "Jammu & Kashmir";
  if (lower.includes("karnataka") || lower.includes("bengaluru") || lower.includes("bangalore")) {
    return "Karnataka";
  }
  if (lower.includes("tamil nadu") || lower.includes("chennai")) return "Tamil Nadu";
  if (lower.includes("gujarat") || lower.includes("ahmedabad")) return "Gujarat";
  return null;
};

/** Best-effort state for GST place-of-supply from a store branch record. */
export const resolveBranchState = (branch: BranchLike): string | null => {
  const byName = branch.name ? stateFromBranchText(branch.name) : null;
  if (byName) return byName;

  const address = branch.address?.trim();
  if (address) {
    const segments = address.split(",").map((part) => part.trim()).filter(Boolean);
    if (segments.length > 0) {
      const last = normalizeStateLabel(segments[segments.length - 1]!);
      const fromLast = stateFromBranchText(last);
      if (fromLast) return fromLast;
    }
    const fromFull = stateFromBranchText(address);
    if (fromFull) return fromFull;
  }

  const byId = stateFromBranchText(branch.id.replace(/-/g, " "));
  return byId;
};
