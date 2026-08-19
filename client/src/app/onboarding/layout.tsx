import { Fraunces, Inter } from "next/font/google";

import { buildPageMetadata } from "@/lib/seo/metadata";
import { organizationSchema, softwareApplicationSchema } from "@/lib/seo/schemas";
import { JsonLd } from "@/lib/seo/json-ld";
import "@/styles/erpnext-auth.css";
import "@/styles/marketing-premium.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-marketing",
  display: "swap",
});

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata = buildPageMetadata({
  title: "Jewellery ERP Software for Indian Jewellers",
  description:
    "Piece-level inventory, karigar production, GST billing, HUID tracking, and a synced online store — built for retail showrooms, manufacturers, and wholesalers across India.",
  path: "/onboarding",
  keywords: [
    "jewellery ERP",
    "jewellery software India",
    "jewellery billing software",
    "HUID tracking software",
    "GST billing for jewellers",
    "jewellery inventory management",
    "karigar production software",
  ],
});

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${inter.variable} ${fraunces.variable} min-h-screen antialiased`}
    >
      <JsonLd data={[softwareApplicationSchema(), organizationSchema()]} />
      {children}
    </div>
  );
}
