"use client";

import { AuthProvider } from "@/lib/auth/auth-context";

export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div
        className="w-full min-h-screen"
        style={{ backgroundColor: "var(--bg-page)", color: "var(--text-primary)" }}
      >
        {children}
      </div>
    </AuthProvider>
  );
}
