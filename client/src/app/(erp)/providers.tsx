"use client";

import { CustomersProvider } from "@/lib/customers/customers-context";
import { InventoryProvider } from "@/lib/inventory/inventory-context";
import { OrdersProvider } from "@/lib/orders/orders-context";
import { RawInventoryProvider } from "@/lib/raw-inventory/raw-inventory-context";
import { SalesProvider } from "@/lib/sales/sales-context";
import { WorkOrdersProvider } from "@/lib/work-orders/work-orders-context";

export default function ErpProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <InventoryProvider>
      <RawInventoryProvider>
        <CustomersProvider>
          <OrdersProvider>
            <WorkOrdersProvider>
              <SalesProvider>{children}</SalesProvider>
            </WorkOrdersProvider>
          </OrdersProvider>
        </CustomersProvider>
      </RawInventoryProvider>
    </InventoryProvider>
  );
}
