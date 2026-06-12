import AppShell from "@/app/(components)/AppShell";
import ErpProviders from "./providers";

export default function ErpLayout({ children }: { children: React.ReactNode }) {
  return (
    <ErpProviders>
      <AppShell>{children}</AppShell>
    </ErpProviders>
  );
}
