import type { Metadata } from "next";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import DashboardWrapper from "./dashboardWrapper";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Shree Hari Jewels - ERP",
  description: "Jewelry inventory, orders, and business management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${cormorant.variable} h-full antialiased`}
    >
      <body className="min-h-full w-full overflow-x-hidden">
        <DashboardWrapper>{children}</DashboardWrapper>
      </body>
    </html>
  );
}
