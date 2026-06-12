import AppShell from "@/app/(components)/AppShell";
import AuthGuard from "@/app/(components)/AuthGuard";
import ErpProviders from "./providers";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ErpProviders>
        <AppShell>{children}</AppShell>
      </ErpProviders>
    </AuthGuard>
  );
}
