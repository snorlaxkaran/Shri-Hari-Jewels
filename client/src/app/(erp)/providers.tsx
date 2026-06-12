"use client";

import { InventoryProvider } from "@/lib/inventory/inventory-context";

export default function ErpProviders({
  children,
}: {
  children: React.ReactNode;
}) {
  return <InventoryProvider>{children}</InventoryProvider>;
}
