"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Scan & Send", href: "/stock-transfer" },
  { label: "Sent to Stores", href: "/stock-transfer/sent" },
  { label: "Incoming Stock", href: "/stock-transfer/incoming" },
] as const;

export default function TransferTabs({
  pendingIncoming,
}: {
  pendingIncoming?: number;
}) {
  const pathname = usePathname();

  return (
    <div className="mb-5 flex flex-wrap gap-2">
      {tabs.map((tab) => {
        const active =
          tab.href === "/stock-transfer"
            ? pathname === "/stock-transfer"
            : pathname.startsWith(tab.href);

        const badge =
          tab.href === "/stock-transfer/incoming" &&
          pendingIncoming != null &&
          pendingIncoming > 0
            ? pendingIncoming
            : undefined;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`tab-btn inline-flex items-center gap-2 ${
              active ? "tab-btn-active" : "tab-btn-inactive"
            }`}
          >
            {tab.label}
            {badge !== undefined && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                {badge}
              </span>
            )}
          </Link>
        );
      })}
    </div>
  );
}
