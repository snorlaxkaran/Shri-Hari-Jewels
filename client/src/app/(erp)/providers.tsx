"use client";

import { CustomersProvider } from "@/lib/customers/customers-context";
import { InventoryProvider } from "@/lib/inventory/inventory-context";
import { OrdersProvider } from "@/lib/orders/orders-context";
import { RawInventoryProvider } from "@/lib/raw-inventory/raw-inventory-context";
import { SalesProvider } from "@/lib/sales/sales-context";
import { WorkOrdersProvider } from "@/lib/work-orders/work-orders-context";
import { DesignsProvider } from "@/lib/designs/designs-context";
import { ProductionRunsProvider } from "@/lib/production-runs/production-runs-context";
import { useAuth } from "@/lib/auth/auth-context";

export default function ErpProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const tenantKey = user ? `${user.id}:${user.organizationId ?? "none"}` : "guest";

  return (
    <InventoryProvider key={tenantKey}>
      <RawInventoryProvider key={tenantKey}>
        <CustomersProvider key={tenantKey}>
          <OrdersProvider key={tenantKey}>
            <WorkOrdersProvider key={tenantKey}>
              <DesignsProvider key={tenantKey}>
                <ProductionRunsProvider key={tenantKey}>
                  <SalesProvider key={tenantKey}>{children}</SalesProvider>
                </ProductionRunsProvider>
              </DesignsProvider>
            </WorkOrdersProvider>
          </OrdersProvider>
        </CustomersProvider>
      </RawInventoryProvider>
    </InventoryProvider>
  );
}
