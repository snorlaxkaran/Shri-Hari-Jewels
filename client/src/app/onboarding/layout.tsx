import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";

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

export const metadata: Metadata = {
  title: "Shri Hari Jewels · Jewellery ERP + Online Store",
  description:
    "Piece-level inventory, production floor, GST billing, and a synced online store — built for Indian jewellers.",
};

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className={`${inter.variable} ${fraunces.variable} min-h-screen antialiased`}
    >
      {children}
    </div>
  );
}
