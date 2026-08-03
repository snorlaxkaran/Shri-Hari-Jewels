import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
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
  const whatsappHref = config.whatsappNumber
    ? `https://wa.me/91${config.whatsappNumber.replace(/\D/g, "")}`
    : null;

  return (
    <footer className="sf-footer">
      <div className="sf-shell sf-footer-grid">
        <div>
          <p className="sf-footer-brand">{config.businessName}</p>
          {config.tagline && (
            <p className="mt-2 text-sm text-[#a8a4a0] leading-relaxed max-w-xs">{config.tagline}</p>
          )}
          {config.gstNumber && (
            <p className="mt-3 text-xs text-[#7a7672]">GSTIN: {config.gstNumber}</p>
          )}
          <div className="mt-4 flex flex-wrap gap-2">
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="sf-btn sf-btn-gold sf-btn-sm">
                <MessageCircle size={14} />
                WhatsApp
              </a>
            )}
            {config.contactPhone && (
              <a href={`tel:${config.contactPhone}`} className="sf-btn sf-btn-outline-light sf-btn-sm">
                <Phone size={14} />
                Call store
              </a>
            )}
          </div>
        </div>

        <div>
          <p className="sf-footer-heading">Shop</p>
          <Link href={`${base}/products`} className="sf-footer-link">All jewellery</Link>
          <Link href={`${base}/collections`} className="sf-footer-link">Collections</Link>
          <Link href={`${base}/about`} className="sf-footer-link">About us</Link>
        </div>

        <div>
          <p className="sf-footer-heading">Visit us</p>
          {config.contactPhone && <p className="text-sm text-[#a8a4a0]">{config.contactPhone}</p>}
          {config.contactEmail && (
            <a href={`mailto:${config.contactEmail}`} className="sf-footer-link">
              {config.contactEmail}
            </a>
          )}
          {address && <p className="mt-2 text-sm text-[#a8a4a0] leading-relaxed">{address}</p>}
        </div>

        <div>
          <p className="sf-footer-heading">Follow</p>
          {config.instagramUrl && (
            <a href={config.instagramUrl} target="_blank" rel="noopener noreferrer" className="sf-footer-link">
              Instagram
            </a>
          )}
          {config.facebookUrl && (
            <a href={config.facebookUrl} target="_blank" rel="noopener noreferrer" className="sf-footer-link">
              Facebook
            </a>
          )}
          {config.returnPolicy && (
            <p className="mt-3 text-xs text-[#7a7672] leading-relaxed">{config.returnPolicy}</p>
          )}
        </div>
      </div>

      <div className="sf-shell sf-footer-bottom">
        © {new Date().getFullYear()} {config.businessName}. Crafted with Shri Hari Jewels.
      </div>
    </footer>
  );
}
