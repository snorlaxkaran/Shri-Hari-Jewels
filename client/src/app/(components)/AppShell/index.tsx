"use client";

import { useState } from "react";
import TopBar from "@/app/(components)/TopBar";
import Breadcrumbs from "@/app/(components)/Breadcrumbs";
import NavigationProgress from "@/app/(components)/NavigationProgress";
import Sidebar from "@/app/(components)/Sidebar";
import MarketRateBanner from "@/app/(components)/MarketRateBanner";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div
      style={{
        paddingTop: "var(--topbar-height)",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "var(--bg-page)",
      }}
    >
      <NavigationProgress />
      <TopBar onMenuClick={() => setMobileOpen((prev) => !prev)} />
      <div style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}>
        <Sidebar
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
        />
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Breadcrumbs />
          <MarketRateBanner />
          <main style={{ flex: 1, padding: "20px 24px" }}>{children}</main>
        </div>
      </div>
    </div>
  );
}
