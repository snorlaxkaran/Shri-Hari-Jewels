export const JEWELLERY_MODULES = [
  "inventory",
  "production",
  "sales",
  "storefront",
  "multibranch",
] as const;

export type JewelleryModuleId = (typeof JEWELLERY_MODULES)[number];

export const MODULE_META: Record<
  JewelleryModuleId,
  { label: string; description: string; icon: string; workspaceHref: string }
> = {
  inventory: {
    label: "Inventory & HUID",
    description: "Piece-level stock, entry vouchers, hallmark batches",
    icon: "package",
    workspaceHref: "/workspace/inventory",
  },
  production: {
    label: "Production Floor",
    description: "Designs, motifs, wax-to-QC runs, karigar settlements",
    icon: "factory",
    workspaceHref: "/workspace/production",
  },
  sales: {
    label: "Counter & Billing",
    description: "Live rates, GST invoices, customers, repairs",
    icon: "shopping-cart",
    workspaceHref: "/workspace/sales",
  },
  storefront: {
    label: "Online Store",
    description: "Branded shop synced to counter stock",
    icon: "globe",
    workspaceHref: "/workspace/storefront",
  },
  multibranch: {
    label: "Multi-Branch",
    description: "Inter-branch transfers and consolidated reporting",
    icon: "store",
    workspaceHref: "/workspace/multibranch",
  },
};

export const BUSINESS_TYPES = [
  "Retail showroom",
  "Manufacturer",
  "Wholesale / B2B",
  "Multi-branch house",
  "Other",
] as const;

export const IMPLEMENTING_FOR_OPTIONS = [
  "My own business",
  "A company I work for",
  "A client I'm consulting for",
] as const;

export const TEAM_SIZE_OPTIONS = ["1–10", "11–50", "51–200", "201–1,000", "1,000+"] as const;

export const CURRENT_SYSTEM_OPTIONS = [
  "Tally",
  "Excel / Spreadsheets",
  "QuickBooks",
  "Zoho",
  "Other ERP",
  "Nothing yet — starting fresh",
  "Other",
] as const;

export const BUSINESS_TYPE_MODULES: Record<string, JewelleryModuleId[]> = {
  "Retail showroom": ["inventory", "sales", "storefront"],
  Manufacturer: ["inventory", "production", "sales"],
  "Wholesale / B2B": ["inventory", "sales", "multibranch"],
  "Multi-branch house": ["inventory", "sales", "production", "multibranch", "storefront"],
  Other: ["inventory", "sales"],
};

export type ModuleStepDef = {
  key: string;
  label: string;
  description: string;
  href: string;
};

export const MODULE_STEPS: Record<JewelleryModuleId, ModuleStepDef[]> = {
  inventory: [
    { key: "businessInfo", label: "Business information", description: "Shop name and contact details", href: "/settings" },
    { key: "gstConfigured", label: "GST details", description: "GSTIN for tax invoices", href: "/settings" },
    { key: "branchCreated", label: "Branch / showroom", description: "At least one active branch", href: "/branches" },
    { key: "openingStock", label: "First SKU", description: "Create your first product catalogue entry", href: "/inventory/new" },
    { key: "firstPiece", label: "Opening stock", description: "Add at least one physical piece", href: "/inventory/new" },
  ],
  production: [
    { key: "designCreated", label: "Create a design", description: "CAD-ready design with BOM stages", href: "/designs/new" },
    { key: "motifCreated", label: "Build a motif", description: "Stone rows and metal breakdown", href: "/motifs" },
    { key: "workOrderCreated", label: "Open a work order", description: "Link customer demand to production", href: "/work-orders/new" },
    { key: "productionRunStarted", label: "Start a production run", description: "Track wax through QC on the floor", href: "/production-runs/new" },
    { key: "karigarSettlement", label: "Karigar settlement", description: "Record artisan payment for a stage", href: "/karigar-settlements" },
  ],
  sales: [
    { key: "gstConfigured", label: "GST configured", description: "Required for tax invoices", href: "/settings" },
    { key: "customerAdded", label: "Add a customer", description: "Build your customer ledger", href: "/customers/new" },
    { key: "firstSale", label: "Record a counter sale", description: "Bill with live market rates", href: "/sales" },
    { key: "firstInvoice", label: "Generate GST invoice", description: "PDF invoice with WhatsApp share", href: "/invoices" },
  ],
  storefront: [
    { key: "storeEnabled", label: "Enable online store", description: "Turn on your branded website", href: "/storefront/settings" },
    { key: "productPublished", label: "Publish a product", description: "Choose counter stock for the web", href: "/storefront/products" },
    { key: "webOrderReceived", label: "Receive a web order", description: "Online order lands in the ERP", href: "/storefront/orders" },
  ],
  multibranch: [
    { key: "secondBranch", label: "Add a second branch", description: "Showroom or warehouse location", href: "/branches/new" },
    { key: "stockTransfer", label: "Send stock transfer", description: "Move pieces between branches", href: "/stock-transfer" },
  ],
};

export const modulesForBusinessType = (businessType: string): JewelleryModuleId[] =>
  BUSINESS_TYPE_MODULES[businessType] ?? ["inventory", "sales"];
