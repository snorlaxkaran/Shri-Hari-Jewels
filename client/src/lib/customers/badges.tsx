import type { CustomerDepartment, CustomerType } from "./constants";

const CUSTOMER_TYPE_BADGE: Record<CustomerType, string> = {
  B2B: "bg-blue-100 text-blue-700",
  Wholesale: "bg-purple-100 text-purple-700",
  "Retail / D2C": "bg-teal-100 text-teal-700",
  "Individual Buyer": "bg-zinc-100 text-zinc-600",
  Designer: "bg-amber-100 text-amber-700",
  "Private Label": "bg-rose-100 text-rose-700",
};

const DEPARTMENT_BADGE: Record<CustomerDepartment, string> = {
  Purchase: "bg-orange-100 text-orange-700",
  Inventory: "bg-blue-100 text-blue-700",
  Logistics: "bg-teal-100 text-teal-700",
  Sales: "bg-green-100 text-green-700",
  CRM: "bg-purple-100 text-purple-700",
  "Finance / Accounts": "bg-zinc-100 text-zinc-600",
  Design: "bg-amber-100 text-amber-700",
  Production: "bg-rose-100 text-rose-700",
  Management: "bg-indigo-100 text-indigo-700",
  Other: "bg-zinc-100 text-zinc-600",
};

const OFFICE_TYPE_BADGE: Record<string, string> = {
  "Head Office": "bg-amber-100 text-amber-700",
  "Branch Office": "bg-zinc-100 text-zinc-600",
  "Regional Office": "bg-blue-100 text-blue-700",
  Warehouse: "bg-orange-100 text-orange-700",
  Factory: "bg-rose-100 text-rose-700",
  Showroom: "bg-teal-100 text-teal-700",
};

export function customerTypeBadgeClass(type: string): string {
  return CUSTOMER_TYPE_BADGE[type as CustomerType] ?? "bg-zinc-100 text-zinc-600";
}

export function departmentBadgeClass(department: string): string {
  return DEPARTMENT_BADGE[department as CustomerDepartment] ?? "bg-zinc-100 text-zinc-600";
}

export function officeTypeBadgeClass(officeType: string): string {
  return OFFICE_TYPE_BADGE[officeType] ?? "bg-zinc-100 text-zinc-600";
}

export function CustomerTypeBadge({ type }: { type: string }) {
  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${customerTypeBadgeClass(type)}`}
    >
      {type}
    </span>
  );
}

export function DepartmentBadge({ department }: { department: string }) {
  return (
    <span
      className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${departmentBadgeClass(department)}`}
    >
      {department}
    </span>
  );
}

export function OfficeTypeBadge({ officeType }: { officeType: string }) {
  return (
    <span
      className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${officeTypeBadgeClass(officeType)}`}
    >
      {officeType}
    </span>
  );
}
