"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchOnboardingStatus, type OnboardingStatus } from "@/lib/api/onboarding";
import { MODULE_META, type JewelleryModuleId } from "@/lib/onboarding/config";
import { isMasterAdmin } from "@/lib/auth/permissions";
import { useAuth } from "@/lib/auth/auth-context";

export default function SetupProgressBanner() {
  const { user } = useAuth();
  const [status, setStatus] = useState<OnboardingStatus | null>(null);

  useEffect(() => {
    if (!user || !isMasterAdmin(user.role)) return;
    void fetchOnboardingStatus().then(setStatus);
  }, [user]);

  if (!status?.completed || !user || !isMasterAdmin(user.role)) return null;

  const pending = (Object.entries(status.modules) as [JewelleryModuleId, (typeof status.modules)[JewelleryModuleId]][])
    .filter(([, mod]) => mod && !mod.complete && !mod.dismissed);

  if (pending.length === 0) return null;

  return (
    <div
      className="mb-4 rounded border px-4 py-3 text-sm"
      style={{
        borderColor: "var(--border)",
        background: "var(--accent-muted)",
      }}
    >
      <p className="font-medium">Continue setting up your workspaces</p>
      <p className="mt-1" style={{ color: "var(--text-muted)" }}>
        {pending.length} module{pending.length === 1 ? "" : "s"} still have guided steps.
      </p>
      <ul className="mt-2 flex flex-wrap gap-3">
        {pending.map(([id]) => (
          <li key={id}>
            <Link href={MODULE_META[id].workspaceHref} className="underline font-medium" style={{ color: "var(--accent)" }}>
              {MODULE_META[id].label} →
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
