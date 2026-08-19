import Image from "next/image";
import Link from "next/link";
import { Check, Gem, MapPin } from "lucide-react";
import { AnnouncementBanner } from "../_components/AnnouncementBanner";
import { FAQSection } from "../_components/FAQSection";
import { FeatureCardsGrid } from "../_components/FeatureCardsGrid";
import { MarketingFooter } from "../_components/MarketingFooter";
import { MarketingHeader } from "../_components/MarketingHeader";
import {
  JAIPUR_AREAS,
  JAIPUR_FAQ_ITEMS,
  JAIPUR_HERO,
  JAIPUR_WHY,
} from "@/lib/onboarding/marketing-content";
import { buildPageMetadata } from "@/lib/seo/metadata";
import { JsonLd } from "@/lib/seo/json-ld";
import { faqPageSchema, localBusinessJaipurSchema, organizationSchema } from "@/lib/seo/schemas";

export const metadata = buildPageMetadata({
  title: "Best Jewellery ERP Software in Jaipur, Rajasthan",
  description:
    "Cloud jewellery ERP for Jaipur showrooms, Sitapura manufacturers & wholesalers. GST billing, HUID tracking, karigar production, multi-branch & online store. 2-month free trial.",
  path: "/onboarding/jewellery-erp-jaipur",
  keywords: [
    "jewellery ERP Jaipur",
    "jewellery software Jaipur",
    "ERP software Jaipur jewellers",
    "jewellery billing software Rajasthan",
    "HUID software Jaipur",
    "GST billing jewellery Jaipur",
    "jewellery inventory software India",
    "best ERP for jewellers Jaipur",
    "Sitapura jewellery software",
    "Johari Bazaar billing software",
  ],
});

export default function JewelleryErpJaipurPage() {
  return (
    <div className="mkt-page min-h-screen flex flex-col">
      <JsonLd
        data={[
          localBusinessJaipurSchema(),
          organizationSchema(),
          faqPageSchema(JAIPUR_FAQ_ITEMS),
        ]}
      />
      <AnnouncementBanner />
      <MarketingHeader />

      <section className="mkt-hero">
        <div className="mkt-shell">
          <p className="mkt-eyebrow text-center flex items-center justify-center gap-2">
            <MapPin size={14} />
            {JAIPUR_HERO.eyebrow}
          </p>

          <div className="mt-8 flex flex-col items-center">
            <span className="mkt-brand-mark">
              <Gem size={18} />
            </span>
            <p className="mt-3 text-sm font-semibold tracking-tight">Shri Hari Jewels</p>
          </div>

          <h1 className="mkt-display mkt-hero-title mt-6">{JAIPUR_HERO.title}</h1>
          <p className="mkt-hero-sub">{JAIPUR_HERO.subtitle}</p>
          <p className="mkt-hero-tagline">{JAIPUR_HERO.tagline}</p>

          <div className="mkt-hero-actions">
            <Link href="#faq" className="mkt-btn mkt-btn-outline">
              See Jaipur FAQ
            </Link>
            <Link href="/onboarding/start" className="mkt-btn mkt-btn-dark">
              Start free trial →
            </Link>
          </div>
        </div>

        <div className="mkt-shell mt-12 pb-4">
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-2xl border border-black/10 shadow-2xl">
            <Image
              src="/onboarding/inventory.png"
              alt="Jewellery ERP inventory dashboard for Jaipur showrooms"
              width={1200}
              height={720}
              priority
              className="w-full h-auto"
            />
          </div>
        </div>
      </section>

      <section className="mkt-section mkt-shell">
        <p className="mkt-eyebrow text-center">Why Jaipur jewellers choose us</p>
        <h2 className="mkt-display mkt-section-title mt-3">
          ERP built for jewellery — not generic manufacturing software
        </h2>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {JAIPUR_WHY.map((item) => (
            <article key={item.title} className="mkt-card p-6">
              <h3 className="text-lg font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm mkt-text-secondary leading-relaxed">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <FeatureCardsGrid />

      <section className="mkt-section mkt-shell">
        <p className="mkt-eyebrow text-center">Serving jewellers across Jaipur</p>
        <h2 className="mkt-display mkt-section-title mt-3">
          Trusted by showrooms, manufacturers & wholesalers in Rajasthan
        </h2>
        <p className="mt-4 text-center mkt-text-secondary max-w-2xl mx-auto">
          Cloud-based jewellery ERP — works on counter PCs, manager laptops, and mobile.
          No on-site server required.
        </p>
        <ul className="mt-10 flex flex-wrap justify-center gap-2 max-w-3xl mx-auto">
          {JAIPUR_AREAS.map((area) => (
            <li
              key={area}
              className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 py-1.5 text-sm"
            >
              <Check size={14} className="text-emerald-600" />
              {area}
            </li>
          ))}
        </ul>
      </section>

      <section className="mkt-section mkt-shell max-w-3xl">
        <div className="mkt-card p-8 text-center">
          <h2 className="mkt-display text-2xl sm:text-3xl">
            Ready to modernise your Jaipur jewellery business?
          </h2>
          <p className="mt-4 mkt-text-secondary">
            2-month free trial · Full ERP access · No credit card · Setup in under an hour
          </p>
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/onboarding/start" className="mkt-btn mkt-btn-dark">
              Start free trial →
            </Link>
            <Link href="/shop/shree-hari-jewels" className="mkt-btn mkt-btn-outline">
              Browse demo store
            </Link>
            <Link href="/onboarding" className="mkt-btn mkt-btn-ghost">
              See all features
            </Link>
          </div>
        </div>
      </section>

      <FAQSection
        items={JAIPUR_FAQ_ITEMS}
        eyebrow="Jaipur jewellers ask"
        title="Jewellery ERP FAQ for Jaipur & Rajasthan"
      />

      <MarketingFooter />
    </div>
  );
}
