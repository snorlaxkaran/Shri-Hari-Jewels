"use client";

import { CustomersProvider } from "@/lib/customers/customers-context";
import { InventoryProvider } from "@/lib/inventory/inventory-context";
import { OrdersProvider } from "@/lib/orders/orders-context";
import { RawInventoryProvider } from "@/lib/raw-inventory/raw-inventory-context";
import { SalesProvider } from "@/lib/sales/sales-context";

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
            <SalesProvider>{children}</SalesProvider>
          </OrdersProvider>
        </CustomersProvider>
      </RawInventoryProvider>
    </InventoryProvider>
  );
}
