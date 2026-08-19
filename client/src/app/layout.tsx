import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { rootSiteMetadata } from "@/lib/seo/metadata";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = rootSiteMetadata;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full w-full overflow-x-hidden">{children}</body>
    </html>
  );
}
