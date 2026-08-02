import AppShell from "@/app/(components)/AppShell";
import AuthGuard from "@/app/(components)/AuthGuard";
import CredentialsGate from "@/app/(components)/CredentialsGate";
import SubscriptionGate from "@/app/(components)/SubscriptionGate";
import ErpProviders from "./providers";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <ErpProviders>
        <SubscriptionGate>
          <CredentialsGate>
            <AppShell>{children}</AppShell>
          </CredentialsGate>
        </SubscriptionGate>
      </ErpProviders>
    </AuthGuard>
  );
}
