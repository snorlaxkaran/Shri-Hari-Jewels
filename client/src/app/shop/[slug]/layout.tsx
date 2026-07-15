import type { Metadata } from "next";
import { fetchStorefrontConfig, fetchStorefrontStatus } from "@/lib/api/storefront";
import StoreDisabledPage from "./StoreDisabledPage";
import StorefrontShell from "./StorefrontShell";

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
        title: status.businessName,
        description: `Shop fine jewellery at ${status.businessName}`,
      };
    }
    return { title: "Store" };
  } catch {
    return { title: "Store" };
  }
}

export default async function StorefrontLayout({ children, params }: Props) {
  const { slug } = await params;

  let status;
  try {
    status = await fetchStorefrontStatus(slug);
  } catch {
    return null;
  }

  if (!status.exists || !status.active) {
    return null;
  }

  if (!status.enabled) {
    return (
      <StoreDisabledPage
        businessName={status.businessName ?? slug}
        slug={slug}
      />
    );
  }

  let config;
  try {
    config = await fetchStorefrontConfig(slug);
  } catch {
    return null;
  }

  return (
    <StorefrontShell slug={slug} config={config}>
      {children}
    </StorefrontShell>
  );
}
