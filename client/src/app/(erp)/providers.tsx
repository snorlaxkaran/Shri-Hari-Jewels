"use client";

import { CustomersProvider } from "@/lib/customers/customers-context";
import { InventoryProvider } from "@/lib/inventory/inventory-context";
import { OrdersProvider } from "@/lib/orders/orders-context";
import { RawInventoryProvider } from "@/lib/raw-inventory/raw-inventory-context";
import { SalesProvider } from "@/lib/sales/sales-context";
import { WorkOrdersProvider } from "@/lib/work-orders/work-orders-context";
import { DesignsProvider } from "@/lib/designs/designs-context";
import { ProductionRunsProvider } from "@/lib/production-runs/production-runs-context";

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
              <DesignsProvider>
                <ProductionRunsProvider>
                  <SalesProvider>{children}</SalesProvider>
                </ProductionRunsProvider>
              </DesignsProvider>
            </WorkOrdersProvider>
          </OrdersProvider>
        </CustomersProvider>
      </RawInventoryProvider>
    </InventoryProvider>
  );
}
