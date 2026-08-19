import AppShell from "@/app/(components)/AppShell";
import AuthGuard from "@/app/(components)/AuthGuard";
import { AuthShell } from "@/app/(components)/AuthShell";
import { BackendWarmup } from "@/app/(components)/BackendWarmup";
import CredentialsGate from "@/app/(components)/CredentialsGate";
import SubscriptionGate from "@/app/(components)/SubscriptionGate";
import ErpProviders from "./providers";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell>
      <BackendWarmup />
      <AuthGuard>
        <ErpProviders>
          <SubscriptionGate>
            <CredentialsGate>
              <AppShell>{children}</AppShell>
            </CredentialsGate>
          </SubscriptionGate>
        </ErpProviders>
      </AuthGuard>
    </AuthShell>
  );
}
