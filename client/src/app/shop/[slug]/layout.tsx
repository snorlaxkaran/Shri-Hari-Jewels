import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { notFound } from "next/navigation";
import "@/styles/storefront.css";
import { fetchStorefrontConfig, fetchStorefrontStatus } from "@/lib/api/storefront";
import StoreDisabledPage from "./StoreDisabledPage";
import StorefrontShell from "./StorefrontShell";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-store-display",
  display: "swap",
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-store-body",
  display: "swap",
});

type Props = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  try {
    const { slug } = await params;
    const status = await fetchStorefrontStatus(slug);
    if (status.businessName) {
      return {
        title: `${status.businessName} · Online Jewellery Store`,
        description: `Shop hallmarked gold & diamond jewellery at ${status.businessName}`,
      };
    }
    return { title: "Jewellery Store" };
  } catch {
    return { title: "Jewellery Store" };
  }
}

function StoreStartupMessage({ title, body }: { title: string; body: string }) {
  return (
    <div className={`${fraunces.variable} ${inter.variable} sf-page flex min-h-screen flex-col items-center justify-center px-4 text-center`}>
      <GemPlaceholder />
      <h1 className="sf-display text-2xl mt-6">{title}</h1>
      <p className="mt-3 text-[var(--sf-muted)] max-w-md leading-relaxed">{body}</p>
    </div>
  );
}

function GemPlaceholder() {
  return (
    <div className="w-14 h-14 rounded-full bg-[#f5f3f0] flex items-center justify-center text-[var(--sf-gold,#b8860b)]">
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
        <path d="M6 3h12l4 7-10 11L2 10l4-7z" />
      </svg>
    </div>
  );
}

export default async function StorefrontLayout({ children, params }: Props) {
  const { slug } = await params;

  let status;
  try {
    status = await fetchStorefrontStatus(slug);
  } catch {
    return (
      <StoreStartupMessage
        title="Store is starting up"
        body="The online store is being deployed. Please refresh in a minute."
      />
    );
  }

  if (!status.exists || !status.active) {
    notFound();
  }

  if (!status.enabled) {
    return (
      <div className={`${fraunces.variable} ${inter.variable}`}>
        <StoreDisabledPage businessName={status.businessName ?? slug} slug={slug} />
      </div>
    );
  }

  let config;
  try {
    config = await fetchStorefrontConfig(slug);
  } catch {
    return (
      <StoreStartupMessage
        title="Store is updating"
        body="The store backend is updating. Please refresh shortly."
      />
    );
  }

  return (
    <div className={`${fraunces.variable} ${inter.variable}`}>
      <StorefrontShell slug={slug} config={config}>
        {children}
      </StorefrontShell>
    </div>
  );
}
