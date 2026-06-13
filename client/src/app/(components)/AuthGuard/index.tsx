"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { canAccessRoute } from "@/lib/auth/permissions";
import PageSkeleton from "@/app/(components)/PageSkeleton";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
      return;
    }
    if (!canAccessRoute(user.role, pathname)) {
      router.replace("/dashboard");
    }
  }, [user, loading, pathname, router]);

  // loading is now near-instant (JWT decoded locally, no network)
  // so this skeleton flash is imperceptible
  if (loading) {
    return <PageSkeleton />;
  }

  // Not logged in — redirect is already queued, show nothing
  if (!user) {
    return null;
  }

  if (!canAccessRoute(user.role, pathname)) {
    return null;
  }

  return <>{children}</>;
}
