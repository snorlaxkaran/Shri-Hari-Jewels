"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import FormPageShell from "@/app/(components)/FormPageShell";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ProductionRunForm from "@/app/(components)/production-runs/ProductionRunForm";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageProductionRuns } from "@/lib/auth/permissions";
import { useDesigns } from "@/lib/designs/designs-context";
import { useProductionRuns } from "@/lib/production-runs/production-runs-context";
import { stageToProductionRunSlug } from "@/lib/production-runs/stages";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes-guard";

export default function NewProductionRunPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const canManage = user ? canManageProductionRuns(user.role) : false;
  const { designs, hydrated: designsHydrated, loading: designsLoading } = useDesigns();
  const { addProductionRun } = useProductionRuns();
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const initialDesignId = searchParams.get("designId") ?? undefined;
  const backHref = initialDesignId ? "/designs" : "/production-runs";
  const backLabel = initialDesignId ? "Back to designs" : "Back to production runs";

  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (user && !canManage) {
      router.replace("/production-runs");
    }
  }, [user, canManage, router]);

  const handleBack = () => {
    if (dirty) setLeaveOpen(true);
    else router.push(backHref);
  };

  if (user && !canManage) {
    return null;
  }

  if (!designsHydrated || designsLoading) {
    return <PageSkeleton />;
  }

  return (
    <div className="page-content">
      <FormPageShell
        backHref={backHref}
        backLabel={backLabel}
        title="New Production Run"
        subtitle="Start casting from a design BOM"
        onBackClick={handleBack}
      >
        <ProductionRunForm
          designs={designs}
          initialDesignId={initialDesignId}
          cancelHref={backHref}
          onCancelClick={handleBack}
          onDirtyChange={setDirty}
          onSubmit={async (input) => {
            const run = await addProductionRun(input);
            const slug = stageToProductionRunSlug(run.currentStage) ?? "wax-pattern";
            router.push(`/production-runs/${run.id}/${slug}`);
          }}
        />
      </FormPageShell>

      <ConfirmDialog
        open={leaveOpen}
        title="Discard changes?"
        message="You have unsaved edits. Leave without saving?"
        confirmLabel="Leave"
        cancelLabel="Stay"
        onConfirm={() => router.push(backHref)}
        onCancel={() => setLeaveOpen(false)}
      />
    </div>
  );
}
