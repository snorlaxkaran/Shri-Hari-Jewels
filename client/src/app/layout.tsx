import type { Metadata } from "next";
import "./globals.css";
import DashboardWrapper from "./dashboardWrapper";

export const metadata: Metadata = {
  title: "Jewellery ERP",
  description: "Multi-company jewellery inventory, orders, and business management",
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
      className="h-full antialiased"
    >
      <body className="min-h-full w-full overflow-x-hidden">
        {/*
          Warm up the Render backend early — fires a cheap /api/health ping
          the moment the HTML lands in the browser so cold-start time overlaps
          with the user reading the login page, not with their submit click.
        */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  fetch('${process.env.NEXT_PUBLIC_API_URL ?? "https://shri-hari-jewels-api.onrender.com"}/api/health', { method: 'GET', mode: 'cors' }).catch(function(){});
                } catch(e) {}
              })();
            `,
          }}
        />
        <DashboardWrapper>{children}</DashboardWrapper>
      </body>
    </html>
  );
}
