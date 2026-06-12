import type { UserRole } from "@/lib/types";

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

export const ROLE_LABELS: Record<UserRole, string> = {
  Admin: "Admin",
  ProductionManager: "Production Manager",
  SalesManager: "Sales Manager",
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
