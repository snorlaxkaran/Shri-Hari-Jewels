"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import FormPageShell from "@/app/(components)/FormPageShell";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import AddUnitsSkuPickerForm from "@/app/(components)/inventory/AddUnitsSkuPickerForm";
import { useAuth } from "@/lib/auth/auth-context";
import { canWriteInventory } from "@/lib/auth/permissions";
import { useInventory } from "@/lib/inventory/inventory-context";

export default function AddUnitsPickerPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, hydrated, loading } = useInventory();
  const canAdd = user ? canWriteInventory(user.role) : false;

  const backHref = "/inventory";

  useEffect(() => {
    if (user && !canAdd) {
      router.replace(backHref);
    }
  }, [user, canAdd, router]);

  if (!hydrated || loading) {
    return <PageSkeleton />;
  }

  if (user && !canAdd) {
    return null;
  }

  return (
    <FormPageShell
      backHref={backHref}
      backLabel="Back to products"
      title="Add Units to SKU"
      subtitle="Select a product to add more inventory units"
    >
      <AddUnitsSkuPickerForm
        items={items}
        cancelHref={backHref}
        onSelect={(product) => router.push(`/inventory/${product.id}/add-units`)}
      />
    </FormPageShell>
  );
}
