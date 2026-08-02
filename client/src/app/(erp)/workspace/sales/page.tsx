"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  FileText,
  ShoppingCart,
  UserPlus,
  Users,
  Wrench,
} from "lucide-react";
import ModuleOnboarding from "@/app/(components)/ModuleOnboarding";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import WorkspaceHome from "@/app/(components)/WorkspaceHome";
import { useSales } from "@/lib/sales/sales-context";
import { formatCurrency } from "@/lib/format";

export default function SalesWorkspacePage() {
  const { analytics, hydrated, loading } = useSales();
  const stats = analytics?.stats;

  if (!hydrated || loading) return <PageSkeleton />;

  return (
    <>
      <ModuleOnboarding moduleId="sales" />
      <WorkspaceHome
        title="Counter & Billing"
        subtitle="Live rates, GST invoices, customers, and repairs"
        stats={[
          { label: "Today's sales", value: formatCurrency(stats?.todaySales ?? 0) },
          { label: "Monthly sales", value: formatCurrency(stats?.monthlySales ?? 0) },
          { label: "Total sales", value: String(stats?.totalSales ?? 0) },
        ]}
        action={
          <Link href="/sales" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
            <ShoppingCart size={16} />
            Open counter
          </Link>
        }
        shortcuts={[
          { href: "/sales", label: "Counter sales", description: "Bill with live rates", icon: ShoppingCart },
          { href: "/customers", label: "Customers", description: "Ledger & tiers", icon: Users },
          { href: "/leads", label: "Leads", description: "Walk-ins & appointments", icon: UserPlus },
          { href: "/invoices", label: "Invoices", description: "GST PDF & WhatsApp", icon: FileText },
          { href: "/repairs", label: "Repairs", description: "Track repair orders", icon: Wrench },
        ]}
      />
    </>
  );
}
