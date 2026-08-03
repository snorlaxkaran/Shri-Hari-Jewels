import Link from "next/link";
import { ArrowRight, Gem, MessageCircle, Phone, Store } from "lucide-react";
import {
  fetchStorefrontCategories,
  fetchStorefrontCollections,
  fetchStorefrontConfig,
  fetchStorefrontProducts,
} from "@/lib/api/storefront";
import CollectionCard from "./(components)/CollectionCard";
import ProductCard from "./(components)/ProductCard";

type Props = { params: Promise<{ slug: string }> };

export default async function StorefrontHomePage({ params }: Props) {
  const { slug } = await params;

  const [config, { products }, collections, categories] = await Promise.all([
    fetchStorefrontConfig(slug),
    fetchStorefrontProducts(slug, { limit: 8, sortBy: "newest" }),
    fetchStorefrontCollections(slug),
    fetchStorefrontCategories(slug).catch(() => [] as string[]),
  ]);

  const whatsappHref = config.whatsappNumber
    ? `https://wa.me/91${config.whatsappNumber.replace(/\D/g, "")}`
    : null;

  const heroStyle = config.bannerUrl
    ? { backgroundImage: `url(${config.bannerUrl})` }
    : {
        background: `linear-gradient(135deg, ${config.accentColor} 0%, ${config.primaryColor}99 100%)`,
      };

  return (
    <div>
      <section className="sf-hero">
        <div className="sf-hero-bg" style={heroStyle} />
        <div className="sf-hero-overlay" />
        <div className="sf-hero-content">
          <p className="sf-eyebrow text-white/70 mb-3">Fine jewellery · Hallmarked</p>
          <h1 className="sf-display sf-hero-title">
            {config.heroTitle ?? `Welcome to ${config.businessName}`}
          </h1>
          <p className="sf-hero-sub">
            {config.heroSubtitle ?? config.tagline ?? "Discover handcrafted gold & diamond jewellery"}
          </p>
          <div className="sf-hero-actions">
            <Link href={`/shop/${slug}/products`} className="sf-btn sf-btn-gold">
              Shop collection
            </Link>
            {collections.length > 0 && (
              <Link href={`/shop/${slug}/collections`} className="sf-btn sf-btn-outline-light">
                Explore collections
              </Link>
            )}
          </div>
        </div>
      </section>

      {categories.length > 0 && (
        <section className="sf-section sf-section-alt">
          <div className="sf-shell">
            <div className="sf-section-head">
              <p className="sf-eyebrow">Shop by category</p>
              <h2 className="sf-display sf-section-title mt-2">Find your perfect piece</h2>
              <p className="sf-section-desc">
                Browse rings, necklaces, bangles, and more — curated for every occasion.
              </p>
            </div>
            <div className="sf-category-scroll">
              <Link href={`/shop/${slug}/products`} className="sf-category-pill">
                <Gem size={16} />
                All jewellery
              </Link>
              {categories.map((cat) => (
                <Link
                  key={cat}
                  href={`/shop/${slug}/products?category=${encodeURIComponent(cat)}`}
                  className="sf-category-pill"
                >
                  {cat}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {collections.length > 0 && (
        <section className="sf-section">
          <div className="sf-shell">
            <div className="sf-section-head">
              <p className="sf-eyebrow">Curated for you</p>
              <h2 className="sf-display sf-section-title mt-2">Explore our collections</h2>
              <p className="sf-section-desc">
                From bridal sets to everyday elegance — each collection tells a story.
              </p>
            </div>
            <div className="sf-collection-grid">
              {collections.slice(0, 3).map((col) => (
                <CollectionCard key={col.id} slug={slug} collection={col} />
              ))}
            </div>
            {collections.length > 3 && (
              <div className="text-center mt-8">
                <Link href={`/shop/${slug}/collections`} className="sf-view-all">
                  View all collections
                  <ArrowRight size={16} />
                </Link>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="sf-section sf-section-alt">
        <div className="sf-shell">
          <div className="sf-section-head-row">
            <div>
              <p className="sf-eyebrow">New arrivals</p>
              <h2 className="sf-display sf-section-title mt-2">Trending now</h2>
            </div>
            <Link href={`/shop/${slug}/products`} className="sf-view-all shrink-0">
              View all
              <ArrowRight size={16} />
            </Link>
          </div>
          {products.length === 0 ? (
            <div className="sf-empty">
              <p className="sf-empty-title">New pieces arriving soon</p>
              <p className="sf-empty-desc">Check back shortly or visit our showroom.</p>
            </div>
          ) : (
            <div className="sf-product-grid">
              {products.map((product) => (
                <ProductCard key={product.id} slug={slug} product={product} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="sf-experience">
        <div className="sf-shell">
          <div className="sf-section-head">
            <p className="sf-eyebrow text-white/50">The {config.businessName} experience</p>
            <h2 className="sf-display sf-section-title mt-2 text-white">We&apos;re here to help you choose</h2>
            <p className="sf-section-desc text-white/65">
              Book a consultation, chat on WhatsApp, or visit our showroom — personalised service at every step.
            </p>
          </div>
          <div className="sf-experience-grid">
            <div className="sf-experience-card">
              <Store className="sf-experience-icon mx-auto" strokeWidth={1.5} />
              <h3>Visit the showroom</h3>
              <p>
                {[config.address, config.city].filter(Boolean).join(", ") ||
                  "Walk in to see pieces in person and get expert guidance."}
              </p>
            </div>
            <div className="sf-experience-card">
              <MessageCircle className="sf-experience-icon mx-auto" strokeWidth={1.5} />
              <h3>Chat on WhatsApp</h3>
              <p>Share designs, ask about making charges, or reserve a piece before you visit.</p>
              {whatsappHref && (
                <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className="sf-btn sf-btn-gold sf-btn-sm mt-4">
                  Message us
                </a>
              )}
            </div>
            <div className="sf-experience-card">
              <Phone className="sf-experience-icon mx-auto" strokeWidth={1.5} />
              <h3>Call our team</h3>
              <p>Speak directly with our jewellery consultants for personalised recommendations.</p>
              {config.contactPhone && (
                <a href={`tel:${config.contactPhone}`} className="sf-btn sf-btn-outline-light sf-btn-sm mt-4">
                  {config.contactPhone}
                </a>
              )}
            </div>
          </div>
        </div>
      </section>

      {config.aboutText && (
        <section className="sf-section">
          <div className="sf-shell max-w-3xl text-center mx-auto">
            <p className="sf-eyebrow">Our story</p>
            <h2 className="sf-display sf-section-title mt-2">Crafted with care</h2>
            <p className="mt-4 leading-relaxed text-[var(--sf-muted)] whitespace-pre-line">
              {config.aboutText}
            </p>
            <Link href={`/shop/${slug}/about`} className="sf-view-all mt-6 inline-flex">
              Read more
              <ArrowRight size={16} />
            </Link>
          </div>
        </section>
      )}
    </div>
  );
}
