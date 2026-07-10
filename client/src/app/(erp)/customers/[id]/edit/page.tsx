"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import FormPageShell from "@/app/(components)/FormPageShell";
import PageSkeleton from "@/app/(components)/PageSkeleton";
import CustomerEditForm from "@/app/(components)/customers/CustomerEditForm";
import { fetchCustomer } from "@/lib/api/customers";
import { getApiErrorMessage } from "@/lib/api/client";
import { useAuth } from "@/lib/auth/auth-context";
import { canManageCustomers } from "@/lib/auth/permissions";
import { useCustomers } from "@/lib/customers/customers-context";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes-guard";
import type { CustomerDetail } from "@/lib/types";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default function EditCustomerPage({ params }: PageProps) {
  const { id } = use(params);
  const router = useRouter();
  const { user } = useAuth();
  const { updateCustomer } = useCustomers();
  const canManage = user ? canManageCustomers(user.role) : false;
  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const backHref = `/customers?selected=${id}`;

  useUnsavedChangesGuard(dirty);

  useEffect(() => {
    if (user && !canManage) {
      router.replace("/customers");
    }
  }, [user, canManage, router]);

  useEffect(() => {
    setLoading(true);
    setError("");
    fetchCustomer(id)
      .then(setCustomer)
      .catch((err) => setError(getApiErrorMessage(err, "Failed to load customer.")))
      .finally(() => setLoading(false));
  }, [id]);

  const handleBack = () => {
    if (dirty) setLeaveOpen(true);
    else router.push(backHref);
  };

  if (user && !canManage) {
    return null;
  }

  if (loading) {
    return <PageSkeleton />;
  }

  return (
    <>
      <FormPageShell
        backHref={backHref}
        backLabel="Back to customer"
        title="Edit Customer"
        subtitle={customer?.name}
        error={error && !customer ? error : undefined}
        onBackClick={handleBack}
      >
        {customer && (
          <CustomerEditForm
            customer={customer}
            cancelHref={backHref}
            onCancelClick={handleBack}
            onDirtyChange={setDirty}
            onSubmit={async (input) => {
              await updateCustomer(id, input);
              router.push(backHref);
            }}
          />
        )}
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
