"use client";

import Link from "next/link";
import { useMemo } from "react";
import { Briefcase, Factory, Gem, Palette, Plus } from "lucide-react";
import ModuleOnboarding from "@/app/(components)/ModuleOnboarding";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import WorkspaceHome from "@/app/(components)/WorkspaceHome";
import { useProductionRuns } from "@/lib/production-runs/production-runs-context";

export default function ProductionWorkspacePage() {
  const { productionRuns, hydrated, loading } = useProductionRuns();

  const stats = useMemo(() => {
    const active = productionRuns.filter(
      (r) => r.status === "Open" || r.status === "In Progress",
    );
    const qc = productionRuns.filter((r) => r.currentStage === "Quality Check");
    return {
      active: active.length,
      qc: qc.length,
      total: productionRuns.length,
    };
  }, [productionRuns]);

  if (!hydrated || loading) return <PageSkeleton />;

  return (
    <>
      <ModuleOnboarding moduleId="production" />
      <WorkspaceHome
        title="Production Floor"
        subtitle="Designs, motifs, wax-to-QC runs, and karigar settlements"
        stats={[
          { label: "Active runs", value: String(stats.active) },
          { label: "At QC", value: String(stats.qc) },
          { label: "All runs", value: String(stats.total) },
        ]}
        action={
          <Link
            href="/production-runs/new"
            className="btn-primary px-4 py-2 text-sm inline-flex items-center gap-2"
          >
            <Plus size={16} />
            New run
          </Link>
        }
        shortcuts={[
          { href: "/production-runs/dashboard", label: "Production board", description: "Kanban by stage", icon: Factory },
          { href: "/designs", label: "Designs", description: "CAD & BOM builder", icon: Palette },
          { href: "/motifs", label: "Motifs", description: "Stone & metal BOM", icon: Gem },
          { href: "/work-orders", label: "Work orders", description: "Customer-linked jobs", icon: Briefcase },
          { href: "/karigar-settlements", label: "Karigar settlements", description: "Artisan payments", icon: Briefcase },
        ]}
      />
    </>
  );
}
