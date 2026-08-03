"use client";

import { ExternalLink } from "lucide-react";
import { storefrontProductPath } from "@/lib/storefront/urls";

type ViewOnWebsiteLinkProps = {
  productId: string;
  slug: string | null | undefined;
  published: boolean;
  variant?: "inline" | "button";
};

export default function ViewOnWebsiteLink({
  productId,
  slug,
  published,
  variant = "inline",
}: ViewOnWebsiteLinkProps) {
  const storeHref =
    slug && published ? storefrontProductPath(slug, productId) : null;

  if (!storeHref) {
    if (variant === "button") return null;
    return (
      <span className="text-xs text-zinc-400" title="Publish this product to enable the store link">
        —
      </span>
    );
  }

  if (variant === "button") {
    return (
      <a
        href={storeHref}
        target="_blank"
        rel="noopener noreferrer"
        className="btn-primary inline-flex items-center gap-2 px-4 py-2 text-sm"
      >
        <ExternalLink size={15} />
        View on website
      </a>
    );
  }

  return (
    <a
      href={storeHref}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-700 hover:underline"
    >
      <ExternalLink size={13} />
      View on website
    </a>
  );
}
