/**
 * ERPNext / Frappe UI parity map — single source of truth.
 * Marketing: frappe.io/erpnext · Desk: Frappe v16 Espresso tokens
 */
export const ERPNEXT_UI = {
  marketing: {
    fontDisplay: "Fraunces, Georgia, serif",
    fontBody: "Inter, system-ui, sans-serif",
    colorText: "#171717",
    colorMuted: "#737373",
    colorBorder: "#e5e5e5",
    colorSurface: "#fafafa",
    colorCta: "#171717",
    colorTabActive: "#0089FF",
    headerHeight: "3.25rem",
    heroMaxWidth: "68rem",
    browserRadius: "0.875rem",
    ctaRadius: "9999px",
    sections: [
      "hero",
      "stats",
      "moduleTabs",
      "deepFeatures",
      "faq",
      "implementation",
      "ctaBand",
      "footer",
    ],
  },
  desk: {
    navbarHeight: 48,
    sidebarWidth: 220,
    workspaceDockWidth: 50,
    pageMaxWidth: 900,
    listRowHeight: 44,
    btnHeight: 28,
    inputHeight: 28,
    fontSizeBase: 14,
    fontSizeSm: 13,
    fontSizeXs: 12,
    fontWeightRegular: 420,
    fontWeightMedium: 500,
    colors: {
      primary: "#171717",
      primaryHover: "#383838",
      text: "#171717",
      textMuted: "#525252",
      textLight: "#7c7c7c",
      border: "#ededed",
      controlBg: "#f3f3f3",
      surfaceSidebar: "#f8f8f8",
      surfaceBase: "#ffffff",
      highlight: "#f8f8f8",
      sidebarHover: "#f3f3f3",
      sidebarActive: "#ffffff",
      danger: "#e03636",
      blue: "#0089FF",
    },
  },
} as const;

export type WorkspaceSlug =
  | "inventory"
  | "production"
  | "sales"
  | "storefront"
  | "multibranch";

export const WORKSPACE_SLUG_TO_SECTION: Record<WorkspaceSlug, string> = {
  inventory: "Inventory",
  production: "Production",
  sales: "Sales",
  storefront: "Online Store",
  multibranch: "Stock transfer",
};

export const WORKSPACE_SLUG_TO_MODULE: Record<WorkspaceSlug, string> = {
  inventory: "inventory",
  production: "production",
  sales: "sales",
  storefront: "storefront",
  multibranch: "multibranch",
};
