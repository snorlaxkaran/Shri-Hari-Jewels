export const CUSTOMER_TYPES = [
  "B2B",
  "Retail / D2C",
  "Individual Buyer",
  "Wholesale",
  "Designer",
  "Private Label",
] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_DEPARTMENTS = [
  "Purchase",
  "Inventory",
  "Logistics",
  "Sales",
  "CRM",
  "Finance / Accounts",
  "Design",
  "Production",
  "Management",
  "Other",
] as const;

export type CustomerDepartment = (typeof CUSTOMER_DEPARTMENTS)[number];

export const CUSTOMER_BRANCH_OFFICE_TYPES = [
  "Head Office",
  "Branch Office",
  "Regional Office",
  "Warehouse",
  "Factory",
  "Showroom",
] as const;

export type CustomerBranchOfficeType = (typeof CUSTOMER_BRANCH_OFFICE_TYPES)[number];
