"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { fetchOnboardingStatus } from "@/lib/api/onboarding";

/** Sends trial admins to /setup until login email + password are set. */
export default function CredentialsGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (loading) return;

    if (!user || user.role === "SuperAdmin" || pathname === "/setup") {
      setReady(true);
      return;
    }

    if (user.role !== "Admin") {
      setReady(true);
      return;
    }

    let cancelled = false;
    void fetchOnboardingStatus()
      .then((status) => {
        if (cancelled) return;
        if (!status.account.credentialsConfigured) {
          router.replace("/setup");
          return;
        }
        setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [user, loading, pathname, router]);

  if (loading || !ready) return null;

  return <>{children}</>;
}
