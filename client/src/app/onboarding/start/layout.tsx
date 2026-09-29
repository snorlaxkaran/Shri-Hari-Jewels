import { buildPageMetadata } from "@/lib/seo/metadata";
import { AuthShell } from "@/app/(components)/AuthShell";

export const metadata = buildPageMetadata({
  title: "Start Free Trial — Jewellery ERP",
  description:
    "Register with mobile, user ID, and password for a 2-month free trial. Full access to inventory, GST billing, production, reports, and online store.",
  path: "/onboarding/start",
  noIndex: true,
});

export default function TrialStartLayout({ children }: { children: React.ReactNode }) {
  return <AuthShell>{children}</AuthShell>;
}
