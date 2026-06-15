"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Scan & Send", href: "/stock-transfer" },
  { label: "Sent to Stores", href: "/stock-transfer/sent" },
] as const;

export default function TransferTabs() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap gap-2 mb-5">
      {tabs.map((tab) => {
        const active =
          tab.href === "/stock-transfer"
            ? pathname === "/stock-transfer"
            : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab-btn ${active ? "tab-btn-active" : "tab-btn-inactive"}`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
