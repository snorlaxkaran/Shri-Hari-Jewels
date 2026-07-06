import type { UserRole } from "@/lib/types";

export const ROUTE_ACCESS: Record<UserRole, string[]> = {
  SuperAdmin: ["/platform"],
  Admin: ["*"],
  ProductionManager: [
    "/dashboard",
    "/inventory",
    "/stock-transfer",
    "/raw-inventory",
    "/orders",
    "/work-orders",
    "/designs",
    "/motifs",
    "/production-runs",
    "/sales-analytics",
  ],
  SalesManager: [
    "/dashboard",
    "/inventory",
    "/stock-transfer",
    "/raw-inventory",
    "/sales",
    "/orders",
    "/customers",
    "/sales-analytics",
    "/invoices",
    "/designs",
    "/motifs",
    "/production-runs",
  ],
  Store: ["/dashboard", "/inventory", "/stock-transfer", "/sales", "/customers"],
  Karigar: ["/dashboard", "/orders", "/work-orders", "/designs", "/motifs", "/production-runs"],
  Accountant: ["/dashboard", "/invoices", "/sales-analytics", "/raw-inventory"],
};

export const canAccessRoute = (role: UserRole, pathname: string): boolean => {
  const allowed = ROUTE_ACCESS[role];
  if (allowed.includes("*")) return true;
  return allowed.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
};

export const ROLE_LABELS: Record<UserRole, string> = {
  SuperAdmin: "Platform Admin",
  Admin: "Admin",
  ProductionManager: "Production Manager",
  SalesManager: "Sales Manager",
  Store: "Store",
  Karigar: "Karigar",
  Accountant: "Accountant",
};

export const canWriteInventory = (role: UserRole): boolean =>
  role === "Admin" || role === "ProductionManager" || role === "SalesManager";

export const canReadRawInventory = (role: UserRole): boolean =>
  role === "Admin" ||
  role === "ProductionManager" ||
  role === "SalesManager" ||
  role === "Accountant";

export const canWriteRawInventory = (role: UserRole): boolean =>
  role === "Admin" || role === "ProductionManager";

export const canDeleteProduct = (role: UserRole): boolean => role === "Admin";

export const canManageCustomers = (role: UserRole): boolean =>
  role === "Admin" || role === "SalesManager";

export const canManageDeptContacts = (role: UserRole): boolean =>
  role === "Admin" || role === "SalesManager";

export const canDeleteDeptContacts = (role: UserRole): boolean =>
  role === "Admin";

export const isMasterAdmin = (role: UserRole): boolean =>
  role === "Admin";

export const canManageBranches = (role: UserRole): boolean => role === "Admin";

export const canManageSettings = (role: UserRole): boolean => role === "Admin";

export const canManageStockTransfers = (role: UserRole): boolean =>
  role === "Admin" || role === "ProductionManager" || role === "SalesManager";

export const canViewStockTransfers = (role: UserRole): boolean =>
  role === "Admin" ||
  role === "ProductionManager" ||
  role === "SalesManager" ||
  role === "Store";

export const canViewDesigns = (role: UserRole): boolean =>
  role === "Admin" ||
  role === "ProductionManager" ||
  role === "Karigar" ||
  role === "SalesManager";

export const canManageDesigns = (role: UserRole): boolean =>
  role === "Admin" || role === "ProductionManager";

export const canViewMotifs = (role: UserRole): boolean => canViewDesigns(role);

export const canManageMotifs = (role: UserRole): boolean => canManageDesigns(role);

export const canViewProductionRuns = (role: UserRole): boolean =>
  role === "Admin" ||
  role === "ProductionManager" ||
  role === "Karigar" ||
  role === "SalesManager";

export const canManageProductionRuns = (role: UserRole): boolean =>
  role === "Admin" || role === "ProductionManager";

export const canUpdateProductionRunItems = (role: UserRole): boolean =>
  role === "Admin" || role === "ProductionManager" || role === "Karigar";
