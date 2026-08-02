export const JEWELLERY_MODULES = [
  "inventory",
  "production",
  "sales",
  "storefront",
  "multibranch",
] as const;

export type JewelleryModuleId = (typeof JEWELLERY_MODULES)[number];

export const MODULE_LABELS: Record<JewelleryModuleId, string> = {
  inventory: "Inventory & HUID",
  production: "Production Floor",
  sales: "Counter & Billing",
  storefront: "Online Store",
  multibranch: "Multi-Branch",
};

export const BUSINESS_TYPE_MODULES: Record<string, JewelleryModuleId[]> = {
  "Retail showroom": ["inventory", "sales", "storefront"],
  Manufacturer: ["inventory", "production", "sales"],
  "Wholesale / B2B": ["inventory", "sales", "multibranch"],
  "Multi-branch house": ["inventory", "sales", "production", "multibranch", "storefront"],
  Other: ["inventory", "sales"],
};

export const normalizeModules = (modules: string[]): JewelleryModuleId[] => {
  const set = new Set<JewelleryModuleId>();
  for (const id of modules) {
    if ((JEWELLERY_MODULES as readonly string[]).includes(id)) {
      set.add(id as JewelleryModuleId);
    }
  }
  if (set.size === 0) set.add("inventory");
  return [...set];
};

export const modulesForBusinessType = (businessType: string | null | undefined): JewelleryModuleId[] =>
  BUSINESS_TYPE_MODULES[businessType ?? ""] ?? ["inventory", "sales"];
