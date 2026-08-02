import type { Metadata } from "next";
import { Inter } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-marketing",
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
    <div className={`${inter.variable} min-h-screen font-sans antialiased text-[#171717] bg-white`}>
      {children}
    </div>
  );
}
