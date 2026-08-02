"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { isMasterAdmin } from "@/lib/auth/permissions";
import { fetchOnboardingStatus } from "@/lib/api/onboarding";
import PageSkeleton from "@/app/(components)/PageSkeleton";

const SETUP_EXEMPT = ["/setup", "/billing"];

export default function SetupGate({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const [completed, setCompleted] = useState(true);

  useEffect(() => {
    if (!user || user.role === "SuperAdmin") {
      setChecking(false);
      setCompleted(true);
      return;
    }

    let cancelled = false;
    fetchOnboardingStatus()
      .then((status) => {
        if (!cancelled) {
          setCompleted(status.completed);
          setChecking(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setCompleted(true);
          setChecking(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [user, pathname]);

  useEffect(() => {
    if (checking || !user || user.role === "SuperAdmin") return;
    if (completed) return;
    if (SETUP_EXEMPT.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return;
    router.replace("/setup");
  }, [checking, completed, user, pathname, router]);

  if (!user || user.role === "SuperAdmin") {
    return <>{children}</>;
  }

  if (checking) {
    return <PageSkeleton />;
  }

  if (!completed && pathname !== "/setup") {
    return <PageSkeleton />;
  }

  if (!completed && pathname === "/setup" && !isMasterAdmin(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--bg-page)]">
        <div className="max-w-md w-full surface-card p-8 text-center space-y-4">
          <h1 className="text-lg font-semibold">Setup in progress</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Your organisation admin is completing the initial setup. You&apos;ll get full access once
            they finish the setup wizard.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
