import type { UserRole } from "../../types.js";

export const USER_ROLES: UserRole[] = [
  "Admin",
  "ProductionManager",
  "SalesManager",
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
  ],
  Karigar: ["/dashboard", "/orders"],
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
  role === "Admin" || role === "SalesManager";

export const canRecordSales = (role: UserRole): boolean =>
  role === "Admin" || role === "SalesManager";

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
  role === "Accountant" ||
  role === "ProductionManager" ||
  role === "Karigar";

export const canManageSettings = (role: UserRole): boolean => role === "Admin";

export const canManageBranches = (role: UserRole): boolean => role === "Admin";

export const isAuthenticatedRole = (role: string): role is UserRole =>
  ALL_ROLES.includes(role as UserRole);
