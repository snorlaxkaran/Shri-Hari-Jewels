"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useMemo, useState } from "react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import FormPageShell from "@/app/(components)/FormPageShell";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import AddUnitsForm from "@/app/(components)/inventory/AddUnitsForm";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import { useInventory } from "@/lib/inventory/inventory-context";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes-guard";

type PageProps = {
  params: Promise<{ productId: string }>;
};

export default function AddUnitsPage({ params }: PageProps) {
  const { productId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { items, hydrated, loading, addQuantityToSku } = useInventory();
  const canAdd = user ? canWriteInventory(user.role) : false;
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const product = items.find((item) => item.id === productId);
  const backHref = "/inventory";

  const existingUnitCodes = useMemo(
    () => items.flatMap((item) => item.units.map((unit) => unit.itemCode)),
    [items],
  );

  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (user && !canAdd) {
      router.replace(backHref);
    }
  }, [user, canAdd, router]);

  const handleBack = () => {
    if (dirty) setLeaveOpen(true);
    else router.push(backHref);
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  if (user && !canAdd) {
    return null;
  }

  if (!product) {
    return (
      <FormPageShell
        backHref={backHref}
        backLabel="Back to products"
        title="Add Units"
        error="Product not found."
      >
        <div />
      </FormPageShell>
    );
  }

  return (
    <>
      <FormPageShell
        backHref={backHref}
        backLabel="Back to products"
        title="Add Units"
        subtitle={`${product.sku} — ${product.name}`}
        onBackClick={handleBack}
      >
        <AddUnitsForm
          product={product}
          existingUnitCodes={existingUnitCodes}
          cancelHref={backHref}
          onCancelClick={handleBack}
          onDirtyChange={setDirty}
          onSubmit={async (quantity) => {
            await addQuantityToSku(product.sku, quantity);
            router.push(backHref);
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
    </>
  );
}
