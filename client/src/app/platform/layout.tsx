"use client";

import AuthGuard from "@/app/(components)/AuthGuard";
import { AuthShell } from "@/app/(components)/AuthShell";

export default function PlatformLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthShell>
      <AuthGuard>{children}</AuthGuard>
    </AuthShell>
  );
}
