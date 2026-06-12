"use client";

import PageHeader from "@/app/(components)/PageHeader";
import { goldRates } from "@/lib/mock-data";
import { formatCurrency } from "@/lib/format";
import { RefreshCw } from "lucide-react";

export default function PricingPage() {
  const rates = [
    { label: "24K Gold (per gram)", key: "24K" as const },
    { label: "22K Gold (per gram)", key: "22K" as const },
    { label: "18K Gold (per gram)", key: "18K" as const },
    { label: "14K Gold (per gram)", key: "14K" as const },
    { label: "Silver 925 (per gram)", key: "925" as const },
  ];

  return (
    <div>
      <PageHeader
        title="Pricing"
        subtitle="Live metal rates and making charges"
        action={
          <button className="btn-secondary flex items-center gap-2 px-4 py-2 text-sm">
            <RefreshCw size={14} />
            Refresh Rates
          </button>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {rates.map((rate) => (
          <div key={rate.key} className="surface-card p-5">
            <p className="text-xs mb-1 text-zinc-400">{rate.label}</p>
            <p className="text-2xl font-semibold text-zinc-900 tracking-tight">
              {formatCurrency(goldRates[rate.key])}
            </p>
          </div>
        ))}
      </div>

      <div className="surface-card p-5">
        <h2 className="text-sm font-semibold mb-4 text-zinc-900">
          Making Charges Calculator
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Weight (grams)
            </label>
            <input
              type="number"
              defaultValue={10}
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Purity
            </label>
            <select className="input-field w-full px-3 py-2 text-sm">
              <option value="22K">22K Gold</option>
              <option value="18K">18K Gold</option>
              <option value="24K">24K Gold</option>
            </select>
          </div>
          <div>
            <label className="text-xs block mb-1 text-zinc-500 font-medium">
              Making Charges (₹)
            </label>
            <input
              type="number"
              defaultValue={5000}
              className="input-field w-full px-3 py-2 text-sm"
            />
          </div>
        </div>
        <p className="text-xs mt-3 text-zinc-400">
          Last updated:{" "}
          {new Date(goldRates.lastUpdated).toLocaleString("en-IN")}
        </p>
      </div>
    </div>
  );
}
