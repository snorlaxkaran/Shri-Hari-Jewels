import { AuthShell } from "@/app/(components)/AuthShell";
import { BackendWarmup } from "@/app/(components)/BackendWarmup";

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthShell>
      <BackendWarmup />
      {children}
    </AuthShell>
  );
}
