import Link from "next/link";
import { Gem } from "lucide-react";
import { HeroScreenshotCarousel } from "./HeroScreenshotCarousel";

export function HeroSection() {
  return (
    <section className="mkt-hero">
      <div className="mkt-shell">
        <Link href="/onboarding/start" className="mkt-banner-pill">
          <span>✦</span>
          2-month free trial
          <span className="mkt-banner-sep">/</span>
          No credit card required
        </Link>

        <div className="mt-8 flex flex-col items-center">
          <span className="mkt-brand-mark">
            <Gem size={18} />
          </span>
          <p className="mt-3 text-sm font-semibold tracking-tight">Shri Hari Jewels</p>
        </div>

        <h1 className="mkt-display mkt-hero-title mt-6">
          The only jewellery ERP
          <br />
          you&apos;ll ever need
        </h1>
        <p className="mkt-hero-sub">User-friendly. Customisable. All-in-one.</p>
        <p className="mkt-hero-tagline">
          Piece-level inventory, karigar production, GST billing &amp; online store
        </p>

        <div className="mkt-hero-actions">
          <Link href="#request-demo" className="mkt-btn mkt-btn-outline">
            Request a demo
          </Link>
          <Link href="/onboarding/start" className="mkt-btn mkt-btn-dark">
            Start free trial →
          </Link>
        </div>
      </div>

      <HeroScreenshotCarousel />
    </section>
  );
}
