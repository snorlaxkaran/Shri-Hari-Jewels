"use client";

import { useState } from "react";
import Navbar from "@/app/(components)/Navbar";
import NavigationProgress from "@/app/(components)/NavigationProgress";
import Sidebar from "@/app/(components)/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex h-screen w-full min-h-0" style={{ backgroundColor: "var(--bg-page)" }}>
      <NavigationProgress />
      <Sidebar
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
      />
      <div className="flex flex-col flex-1 min-w-0 overflow-auto p-4 md:p-6 lg:p-8">
        <Navbar onMenuClick={() => setMobileOpen((prev) => !prev)} />
        <main className="flex-1 w-full min-w-0">{children}</main>
      </div>
    </div>
  );
}
