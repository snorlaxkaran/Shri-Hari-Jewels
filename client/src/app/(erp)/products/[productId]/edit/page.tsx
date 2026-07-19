"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import FormPageShell from "@/app/(components)/FormPageShell";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import ProductEditForm from "@/app/(components)/products/ProductEditForm";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import { useInventory } from "@/lib/inventory/inventory-context";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes-guard";

type PageProps = {
  params: Promise<{ productId: string }>;
};

export default function EditCatalogProductPage({ params }: PageProps) {
  const { productId } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { items, hydrated, loading, updateProduct } = useInventory();
  const canWrite = user ? canWriteInventory(user.role) : false;
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const product = items.find((item) => item.id === productId);
  const backHref = "/products";

  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (user && !canWrite) {
      router.replace(backHref);
    }
  }, [user, canWrite, router, backHref]);

  const handleBack = () => {
    if (dirty) setLeaveOpen(true);
    else router.push(backHref);
  };

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  if (user && !canWrite) {
    return null;
  }

  if (!product) {
    return (
      <div className="page-content">
        <FormPageShell
          backHref={backHref}
          backLabel="Back to products"
          title="Edit Product"
          error="Product not found."
        >
          <div />
        </FormPageShell>
      </div>
    );
  }

  return (
    <div className="page-content">
      <FormPageShell
        backHref={backHref}
        backLabel="Back to products"
        title="Edit Product"
        subtitle={product.sku}
        onBackClick={handleBack}
      >
        <ProductEditForm
          product={product}
          mode="catalog"
          cancelHref={backHref}
          onCancelClick={handleBack}
          onDirtyChange={setDirty}
          onSubmit={async (input) => {
            await updateProduct(product.id, input);
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
    </div>
  );
}
