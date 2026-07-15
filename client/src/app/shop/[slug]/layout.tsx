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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f7] px-4 text-center">
        <div className="max-w-md">
          <p className="text-4xl mb-6">⏳</p>
          <h1 className="text-2xl font-light text-zinc-800">Store is starting up</h1>
          <p className="mt-4 text-zinc-600 leading-relaxed">
            The online store is being deployed. Please refresh in a minute.
          </p>
        </div>
      </div>
    );
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
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#faf9f7] px-4 text-center">
        <div className="max-w-md">
          <p className="text-4xl mb-6">⏳</p>
          <h1 className="text-2xl font-light text-zinc-800">Store is starting up</h1>
          <p className="mt-4 text-zinc-600 leading-relaxed">
            The store backend is updating. Please refresh shortly.
          </p>
        </div>
      </div>
    );
  }

  return (
    <StorefrontShell slug={slug} config={config}>
      {children}
    </StorefrontShell>
  );
}
