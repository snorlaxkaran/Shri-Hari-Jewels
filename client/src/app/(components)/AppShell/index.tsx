"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import TopBar from "@/app/(components)/TopBar";
import Breadcrumbs from "@/app/(components)/Breadcrumbs";
import NavigationProgress from "@/app/(components)/NavigationProgress";
import Sidebar from "@/app/(components)/Sidebar";
import WorkspaceDock from "@/app/(components)/WorkspaceDock";
import MarketRateBanner from "@/app/(components)/MarketRateBanner";
import SubscriptionWarningBanner from "@/app/(components)/SubscriptionWarningBanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const isSetupWizard = pathname === "/setup";

  if (isSetupWizard) {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      <NavigationProgress />
      <TopBar onMenuClick={() => setMobileOpen((prev) => !prev)} />
      <div className="app-body">
        <WorkspaceDock />
        <Sidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
        <div className="app-main-column">
          <Breadcrumbs />
          <SubscriptionWarningBanner />
          <MarketRateBanner />
          <main className="app-main">{children}</main>
        </div>
      </div>
    </div>
  );
}
