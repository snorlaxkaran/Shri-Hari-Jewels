import AppShell from "@/app/(components)/AppShell";
import AuthGuard from "@/app/(components)/AuthGuard";
import SetupGate from "@/app/(components)/SetupGate";
import SubscriptionGate from "@/app/(components)/SubscriptionGate";
import ErpProviders from "./providers";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ErpProviders>
        <SetupGate>
          <SubscriptionGate>
            <AppShell>{children}</AppShell>
          </SubscriptionGate>
        </SetupGate>
      </ErpProviders>
    </AuthGuard>
  );
}
