"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  Award,
  ClipboardCheck,
  Gem,
  Package,
  Plus,
  Tags,
} from "lucide-react";
import ModuleOnboarding from "@/app/(components)/ModuleOnboarding";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import WorkspaceHome from "@/app/(components)/WorkspaceHome";
import { fetchHallmarkPendingCount } from "@/lib/api/hallmark";
import { useInventory } from "@/lib/inventory/inventory-context";
import { flattenInventoryToUnitRows } from "@/lib/inventory/unit-rows";

export default function InventoryWorkspacePage() {
  const { items, hydrated, loading } = useInventory();
  const [hallmarkPending, setHallmarkPending] = useState<number | null>(null);

  useEffect(() => {
    fetchHallmarkPendingCount()
      .then(setHallmarkPending)
      .catch(() => setHallmarkPending(null));
  }, []);

  const unitRows = useMemo(() => flattenInventoryToUnitRows(items), [items]);
  const skuCount = useMemo(() => new Set(items.map((p) => p.sku)).size, [items]);

  if (!hydrated || loading) return <PageSkeleton />;

  return (
    <>
      <ModuleOnboarding moduleId="inventory" />
      <WorkspaceHome
        title="Inventory & HUID"
        subtitle="Piece-level stock, entry verification, and hallmark compliance"
        stats={[
          { label: "Pieces on floor", value: String(unitRows.length) },
          { label: "Active SKUs", value: String(skuCount) },
          { label: "Needs hallmark", value: String(hallmarkPending ?? 0) },
          { label: "Product lines", value: String(items.length) },
        ]}
        action={
          <Link href="/inventory/new" className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2">
            <Plus size={16} />
            Add stock
          </Link>
        }
        shortcuts={[
          { href: "/inventory", label: "All stock", description: "Browse every piece", icon: Package },
          { href: "/products", label: "Products / SKUs", description: "Catalogue master", icon: Tags },
          { href: "/hallmark", label: "Hallmark batches", description: "HUID tracking", icon: Award },
          { href: "/entry-verification", label: "Entry verification", description: "Verify incoming stock", icon: ClipboardCheck },
          { href: "/raw-inventory", label: "Raw materials", description: "Metal lots & stones", icon: Gem },
        ]}
      />
    </>
  );
}
