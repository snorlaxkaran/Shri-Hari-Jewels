"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOnboardingStatus } from "@/lib/api/onboarding";

export default function OnboardingPage() {
  const [status, setStatus] = useState<Awaited<ReturnType<typeof fetchOnboardingStatus>> | null>(null);

  useEffect(() => {
    void fetchOnboardingStatus().then(setStatus);
  }, []);

  if (!status) return <p className="p-6">Loading setup wizard…</p>;

  const steps = [
    { key: "businessInfo", label: "Business information", href: "/settings" },
    { key: "gstConfigured", label: "GST details", href: "/settings" },
    { key: "branchCreated", label: "Branch setup", href: "/branches" },
    { key: "openingStock", label: "Opening stock", href: "/inventory/new" },
  ] as const;

  return (
    <div className="p-6 max-w-xl space-y-6">
      <h1 className="text-xl font-semibold">Setup Wizard</h1>
      <p style={{ color: "var(--text-muted)" }}>
        Complete these steps to get your ERP ready for daily operations.
      </p>
      <ul className="space-y-3">
        {steps.map((step) => {
          const done = status.steps[step.key];
          return (
            <li
              key={step.key}
              className="flex items-center justify-between surface-card rounded-lg p-4"
            >
              <span>{step.label}</span>
              {done ? (
                <span className="text-green-600 text-sm">Done</span>
              ) : (
                <Link href={step.href} className="text-sm" style={{ color: "var(--accent)" }}>
                  Configure →
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
