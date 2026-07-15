import Link from "next/link";
import type { StorefrontConfig } from "@/lib/storefront/types";

export default function StorefrontFooter({
  slug,
  config,
}: {
  slug: string;
  config: StorefrontConfig;
}) {
  const base = `/shop/${slug}`;
  const address = [config.address, config.city, config.state, config.pincode]
    .filter(Boolean)
    .join(", ");

  return (
    <footer
      className="mt-auto border-t"
      style={{ backgroundColor: config.accentColor, color: "#f5f5f5" }}
    >
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-2 lg:grid-cols-4 sm:px-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">
            {config.businessName}
          </h3>
          {config.tagline && (
            <p className="text-sm text-zinc-300">{config.tagline}</p>
          )}
          {config.gstNumber && (
            <p className="mt-2 text-xs text-zinc-400">GST: {config.gstNumber}</p>
          )}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">Shop</h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            <li><Link href={`${base}/products`} className="hover:text-white">All Products</Link></li>
            <li><Link href={`${base}/collections`} className="hover:text-white">Collections</Link></li>
            <li><Link href={`${base}/about`} className="hover:text-white">About Us</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">Contact</h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            {config.contactPhone && <li>{config.contactPhone}</li>}
            {config.contactEmail && <li>{config.contactEmail}</li>}
            {address && <li>{address}</li>}
          </ul>
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider">Follow</h3>
          <ul className="space-y-2 text-sm text-zinc-300">
            {config.instagramUrl && (
              <li>
                <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  Instagram
                </a>
              </li>
            )}
            {config.facebookUrl && (
              <li>
                <a href={config.facebookUrl} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  Facebook
                </a>
              </li>
            )}
            {config.whatsappNumber && (
              <li>
                <a
                  href={`https://wa.me/91${config.whatsappNumber.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white"
                >
                  WhatsApp
                </a>
              </li>
            )}
          </ul>
        </div>
      </div>

      <div className="border-t border-white/10 px-4 py-4 text-center text-xs text-zinc-400">
        © {new Date().getFullYear()} {config.businessName}. All rights reserved.
      </div>
    </footer>
  );
}
