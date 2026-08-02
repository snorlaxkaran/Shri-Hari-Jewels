import type { LucideIcon } from "lucide-react";
import {
  FileText,
  Package,
  ShoppingCart,
  UserPlus,
  Users,
} from "lucide-react";

export type HomeShortcut = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export const HOME_SHORTCUTS: HomeShortcut[] = [
  {
    label: "Counter sale",
    href: "/sales",
    description: "Bill at live rates",
    icon: ShoppingCart,
  },
  {
    label: "Add stock",
    href: "/inventory/new",
    description: "New SKU + pieces",
    icon: Package,
  },
  {
    label: "Customer",
    href: "/customers/new",
    description: "New ledger entry",
    icon: Users,
  },
  {
    label: "Invoice",
    href: "/invoices",
    description: "GST PDF invoices",
    icon: FileText,
  },
  {
    label: "Lead",
    href: "/leads",
    description: "Follow-ups & CRM",
    icon: UserPlus,
  },
];
