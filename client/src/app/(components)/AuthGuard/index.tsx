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

  if (loading || !user) {
    return <PageSkeleton />;
  }

  if (!canAccessRoute(user.role, pathname)) {
    return <PageSkeleton />;
  }

  return <>{children}</>;
}
