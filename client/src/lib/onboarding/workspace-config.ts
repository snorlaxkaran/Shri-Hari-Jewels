import type { JewelleryModuleId } from "./config";

export type WorkspaceShortcut = {
  label: string;
  href: string;
  description?: string;
};

export type WorkspaceLink = {
  label: string;
  href: string;
  /** Highlight in onboarding — ERPNext `onboard: 1` */
  onboard?: boolean;
};

export type WorkspaceCard = {
  title: string;
  links: WorkspaceLink[];
};

export type WorkspaceConfig = {
  title: string;
  subtitle: string;
  shortcuts: WorkspaceShortcut[];
  cards: WorkspaceCard[];
};

export const WORKSPACE_CONFIG: Record<JewelleryModuleId, WorkspaceConfig> = {
  inventory: {
    title: "Inventory & HUID",
    subtitle: "Piece-level stock, hallmark batches, and raw metal",
    shortcuts: [
      { label: "All stock", href: "/inventory", description: "Every physical piece" },
      { label: "Add stock", href: "/inventory/new", description: "New SKU + pieces" },
      { label: "Products", href: "/products", description: "Catalogue master" },
      { label: "Hallmark", href: "/hallmark", description: "BIS / HUID batches" },
    ],
    cards: [
      {
        title: "Stock operations",
        links: [
          { label: "Entry verification", href: "/entry-verification", onboard: true },
          { label: "Raw materials", href: "/raw-inventory" },
          { label: "Add units to SKU", href: "/inventory/add-units" },
        ],
      },
      {
        title: "Masters & settings",
        links: [
          { label: "Branches", href: "/branches", onboard: true },
          { label: "Business settings", href: "/settings", onboard: true },
          { label: "Category report", href: "/reports/category" },
        ],
      },
    ],
  },
  production: {
    title: "Production Floor",
    subtitle: "Designs, wax-to-QC runs, and karigar settlements",
    shortcuts: [
      { label: "New design", href: "/designs/new" },
      { label: "Motif library", href: "/motifs" },
      { label: "Work order", href: "/work-orders/new" },
      { label: "Start run", href: "/production-runs/new" },
    ],
    cards: [
      {
        title: "Shop floor",
        links: [
          { label: "Production runs", href: "/production-runs", onboard: true },
          { label: "Production board", href: "/production-runs/dashboard" },
          { label: "Work orders", href: "/work-orders", onboard: true },
        ],
      },
      {
        title: "Settlements & reports",
        links: [
          { label: "Karigar settlements", href: "/karigar-settlements", onboard: true },
          { label: "Designs", href: "/designs", onboard: true },
          { label: "Production report", href: "/reports/production" },
        ],
      },
    ],
  },
  sales: {
    title: "Counter & Billing",
    subtitle: "Live rates, GST invoices, customers, and repairs",
    shortcuts: [
      { label: "Counter sale", href: "/sales", description: "Bill at the counter" },
      { label: "New customer", href: "/customers/new" },
      { label: "Invoices", href: "/invoices" },
      { label: "Orders", href: "/orders" },
    ],
    cards: [
      {
        title: "Transactions",
        links: [
          { label: "Customers", href: "/customers", onboard: true },
          { label: "Repairs", href: "/repairs" },
          { label: "Leads", href: "/leads" },
        ],
      },
      {
        title: "Reports",
        links: [
          { label: "Sales analytics", href: "/sales-analytics" },
          { label: "Sales report", href: "/reports/sales" },
          { label: "GST settings", href: "/settings", onboard: true },
        ],
      },
    ],
  },
  storefront: {
    title: "Online Store",
    subtitle: "Branded shop synced to counter stock",
    shortcuts: [
      { label: "Store settings", href: "/storefront/settings" },
      { label: "Publish products", href: "/storefront/products" },
      { label: "Web orders", href: "/storefront/orders" },
      { label: "Collections", href: "/storefront/collections" },
    ],
    cards: [
      {
        title: "Setup",
        links: [
          { label: "Enable storefront", href: "/storefront/settings", onboard: true },
          { label: "Choose products", href: "/storefront/products", onboard: true },
          { label: "View demo shop", href: "/shop/shree-hari-jewels" },
        ],
      },
      {
        title: "Operations",
        links: [
          { label: "Web orders inbox", href: "/storefront/orders", onboard: true },
          { label: "Counter stock", href: "/inventory" },
        ],
      },
    ],
  },
  multibranch: {
    title: "Multi-Branch",
    subtitle: "Transfers, incoming stock, and branch network",
    shortcuts: [
      { label: "Scan & send", href: "/stock-transfer" },
      { label: "Incoming", href: "/stock-transfer/incoming" },
      { label: "Sent transfers", href: "/stock-transfer/sent" },
      { label: "Add branch", href: "/branches/new" },
    ],
    cards: [
      {
        title: "Transfers",
        links: [
          { label: "Proforma list", href: "/stock-transfer/proforma" },
          { label: "Receive at branch", href: "/stock-transfer/incoming", onboard: true },
          { label: "Send stock", href: "/stock-transfer", onboard: true },
        ],
      },
      {
        title: "Network",
        links: [
          { label: "All branches", href: "/branches", onboard: true },
          { label: "Inventory by branch", href: "/inventory" },
          { label: "Sales analytics", href: "/sales-analytics" },
        ],
      },
    ],
  },
};

export const isWorkspaceModule = (id: string): id is JewelleryModuleId =>
  id in WORKSPACE_CONFIG;
