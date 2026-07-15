"use client";

import { createContext, useContext } from "react";
import type { StorefrontConfig } from "@/lib/storefront/types";

const StorefrontConfigContext = createContext<StorefrontConfig | null>(null);

export const StorefrontConfigProvider = ({
  config,
  children,
}: {
  config: StorefrontConfig;
  children: React.ReactNode;
}) => (
  <StorefrontConfigContext.Provider value={config}>
    <div
      style={
        {
          "--store-primary": config.primaryColor,
          "--store-accent": config.accentColor,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  </StorefrontConfigContext.Provider>
);

export const useStorefrontConfig = (): StorefrontConfig => {
  const ctx = useContext(StorefrontConfigContext);
  if (!ctx) throw new Error("useStorefrontConfig must be used within StorefrontConfigProvider");
  return ctx;
};

export default StorefrontConfigProvider;
