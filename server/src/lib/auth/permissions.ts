import type { UserRole } from "../../types.js";

export const USER_ROLES: UserRole[] = [
  "Admin",
  "ProductionManager",
  "SalesManager",
  "Store",
  "Karigar",
  "Accountant",
];

const ALL_ROLES = USER_ROLES;

export const ROUTE_ACCESS: Record<UserRole, string[]> = {
  Admin: ["*"],
  ProductionManager: [
    "/dashboard",
    "/inventory",
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
  Store: ["/dashboard", "/inventory", "/sales", "/customers"],
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

export const canReadInventory = (role: UserRole): boolean =>
  role === "Admin" ||
  role === "ProductionManager" ||
  role === "SalesManager" ||
  role === "Store" ||
  role === "Accountant";

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
  role === "Admin" || role === "SalesManager" || role === "Store";

export const canRecordSales = (role: UserRole): boolean =>
  role === "Admin" || role === "SalesManager" || role === "Store";

export const canManageOrders = (role: UserRole): boolean =>
  role === "Admin" ||
  role === "ProductionManager" ||
  role === "SalesManager" ||
  role === "Karigar";

export const canViewWorkOrders = (role: UserRole): boolean =>
  role === "Admin" || role === "ProductionManager" || role === "Karigar";

export const canCreateWorkOrders = (role: UserRole): boolean =>
  role === "Admin" || role === "ProductionManager";

export const canUpdateWorkOrders = (role: UserRole): boolean =>
  role === "Admin" || role === "ProductionManager" || role === "Karigar";

export const canViewInvoices = (role: UserRole): boolean =>
  role === "Admin" || role === "SalesManager" || role === "Accountant";

export const canViewAnalytics = (role: UserRole): boolean =>
  role === "Admin" ||
  role === "SalesManager" ||
  role === "Store" ||
  role === "Accountant" ||
  role === "ProductionManager" ||
  role === "Karigar";

export const canManageSettings = (role: UserRole): boolean => role === "Admin";

export const canManageBranches = (role: UserRole): boolean => role === "Admin";

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
  role === "Admin" || role === "ProductionManager";

export const isAuthenticatedRole = (role: string): role is UserRole =>
  ALL_ROLES.includes(role as UserRole);
