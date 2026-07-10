"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import FormPageShell from "@/app/(components)/FormPageShell";
import WorkOrderForm from "@/app/(components)/work-orders/WorkOrderForm";
import { useOrders } from "@/lib/orders/orders-context";
import { useWorkOrders } from "@/lib/work-orders/work-orders-context";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes-guard";

export default function NewWorkOrderPage() {
  const router = useRouter();
  const { orders } = useOrders();
  const { addWorkOrder } = useWorkOrders();
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const backHref = "/work-orders";

  useUnsavedChangesGuard(dirty);

  const handleBack = () => {
    if (dirty) setLeaveOpen(true);
    else router.push(backHref);
  };

  return (
    <>
      <FormPageShell
        backHref={backHref}
        backLabel="Back to work orders"
        title="New Work Order"
        subtitle="Create a production or manufacturing task"
        onBackClick={handleBack}
      >
        <WorkOrderForm
          orders={orders}
          cancelHref={backHref}
          onCancelClick={handleBack}
          onDirtyChange={setDirty}
          onSubmit={async (input) => {
            await addWorkOrder(input);
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
