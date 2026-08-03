import Link from "next/link";
import { MessageCircle, Phone } from "lucide-react";
import { fetchStorefrontConfig } from "@/lib/api/storefront";

type Props = { params: Promise<{ slug: string }> };

export default async function AboutPage({ params }: Props) {
  const { slug } = await params;
  const config = await fetchStorefrontConfig(slug);
  const base = `/shop/${slug}`;

  const address = [config.address, config.city, config.state, config.pincode]
    .filter(Boolean)
    .join(", ");

  const whatsappHref = config.whatsappNumber
    ? `https://wa.me/91${config.whatsappNumber.replace(/\D/g, "")}`
    : null;

  return (
    <div className="sf-section">
      <div className="sf-shell max-w-3xl">
        <p className="sf-eyebrow">About us</p>
        <h1 className="sf-display sf-page-title">{config.businessName}</h1>

        {config.aboutText ? (
          <p className="leading-relaxed text-[var(--sf-muted)] whitespace-pre-line -mt-4">{config.aboutText}</p>
        ) : (
          <p className="leading-relaxed text-[var(--sf-muted)] -mt-4">
            {config.businessName} offers fine handcrafted jewellery. Visit our showroom or shop online
            for hallmarked gold and diamond pieces.
          </p>
        )}

        <div className="sf-summary-card mt-12 space-y-3">
          <h2 className="font-semibold text-lg">Visit &amp; contact</h2>
          {config.contactPhone && (
            <p className="flex items-center gap-2 text-sm">
              <Phone size={16} className="text-[var(--sf-gold)]" />
              <a href={`tel:${config.contactPhone}`} className="sf-link">{config.contactPhone}</a>
            </p>
          )}
          {config.contactEmail && (
            <p className="text-sm">
              <a href={`mailto:${config.contactEmail}`} className="sf-link">{config.contactEmail}</a>
            </p>
          )}
          {address && <p className="text-sm text-[var(--sf-muted)]">{address}</p>}
          {config.gstNumber && <p className="text-xs text-[var(--sf-muted)]">GSTIN: {config.gstNumber}</p>}
          <div className="flex flex-wrap gap-2 pt-2">
            {whatsappHref && (
              <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="sf-btn sf-btn-gold sf-btn-sm">
                <MessageCircle size={14} />
                WhatsApp
              </a>
            )}
            <Link href={`${base}/products`} className="sf-btn sf-btn-outline sf-btn-sm">
              Shop online
            </Link>
          </div>
        </div>

        {config.returnPolicy && (
          <div className="mt-10">
            <h2 className="font-semibold mb-2">Return policy</h2>
            <p className="text-sm text-[var(--sf-muted)] whitespace-pre-line leading-relaxed">{config.returnPolicy}</p>
          </div>
        )}
      </div>
    </div>
  );
}
