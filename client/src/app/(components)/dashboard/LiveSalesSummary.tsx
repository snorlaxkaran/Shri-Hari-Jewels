"use client";

import { useEffect, useState } from "react";
import { useSales } from "@/lib/sales/sales-context";
import { formatCurrency } from "@/lib/format";

export default function LiveSalesSummary() {
  const { analytics, refresh } = useSales();
  const [updatedAt, setUpdatedAt] = useState<Date | null>(null);

  useEffect(() => {
    setUpdatedAt(new Date());
    const interval = setInterval(() => {
      void refresh().then(() => setUpdatedAt(new Date()));
    }, 120_000);
    return () => clearInterval(interval);
  }, [refresh]);

  const todaySales = analytics?.stats?.todaySalesCount ?? 0;
  const todayRevenue = analytics?.stats?.todaySales ?? 0;

  return (
    <div
      className="surface-card rounded-xl px-5 py-4 mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-l-4"
      style={{ borderLeftColor: "var(--accent, #b45309)" }}
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
          Live Sales Today
        </p>
        <p className="text-2xl font-bold text-zinc-900 mt-0.5">
          {formatCurrency(todayRevenue)}
        </p>
      </div>
      <div className="flex items-center gap-6 text-sm">
        <div>
          <p className="text-zinc-500 text-xs">Transactions</p>
          <p className="font-semibold text-zinc-900">{todaySales}</p>
        </div>
        {updatedAt && (
          <p className="text-xs text-zinc-400">
            Updated {updatedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        )}
      </div>
    </div>
  );
}
