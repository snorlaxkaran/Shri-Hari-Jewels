"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import ConfirmDialog from "@/app/(components)/ConfirmDialog";
import FormPageShell from "@/app/(components)/FormPageShell";
import OrderForm from "@/app/(components)/orders/OrderForm";
import { useCustomers } from "@/lib/customers/customers-context";
import { useOrders } from "@/lib/orders/orders-context";
import { useSales } from "@/lib/sales/sales-context";
import { useUnsavedChangesGuard } from "@/lib/hooks/use-unsaved-changes-guard";

export default function NewOrderPage() {
  const router = useRouter();
  const { customers } = useCustomers();
  const { addOrder } = useOrders();
  const { refresh: refreshSales } = useSales();
  const [dirty, setDirty] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);

  const backHref = "/orders";

  useUnsavedChangesGuard(dirty);

  const handleBack = () => {
    if (dirty) setLeaveOpen(true);
    else router.push(backHref);
  };

  return (
    <>
      <FormPageShell
        backHref={backHref}
        backLabel="Back to orders"
        title="New Custom Order"
        subtitle="Create an order for a customer"
        onBackClick={handleBack}
      >
        <OrderForm
          customers={customers}
          cancelHref={backHref}
          onCancelClick={handleBack}
          onDirtyChange={setDirty}
          onSubmit={async (input) => {
            await addOrder(input);
            await refreshSales();
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
