import type { Metadata } from "next";
import { Fraunces, IBM_Plex_Mono } from "next/font/google";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-portfolio-display",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-portfolio-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Jewellery ERP · ERP + Online Store for Indian Jewellers",
  description:
    "Inventory, production, GST billing, and a customer-facing online store — one platform for Indian jewellery businesses.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${fraunces.variable} ${ibmPlexMono.variable} min-h-screen`}
      style={{
        fontFamily: "var(--font-portfolio-display), Georgia, serif",
        backgroundColor: "#f6f1e8",
        color: "#1c1917",
      }}
    >
      {children}
    </div>
  );
}
