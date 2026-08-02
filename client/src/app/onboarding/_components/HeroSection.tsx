import Link from "next/link";
import { Zap } from "lucide-react";
import { HeroScreenshotCarousel } from "./HeroScreenshotCarousel";

export function HeroSection() {
  return (
    <section className="border-b border-[#e5e7eb] bg-white">
      <div className="erp-marketing-shell py-16 lg:py-24 grid lg:grid-cols-2 gap-14 lg:gap-16 items-center">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-[#6b7280] mb-4">
            <Zap size={14} className="text-[#e74c3c]" />
            2-month free trial · No credit card
          </p>
          <h1 className="text-4xl sm:text-5xl lg:text-[3.25rem] font-semibold leading-[1.08] tracking-tight text-[#171717]">
            The only jewellery ERP you&apos;ll ever need
          </h1>
          <p className="mt-5 text-lg text-[#525252] leading-relaxed max-w-lg">
            Piece-level inventory, shop-floor production, GST billing, multi-branch transfers,
            and an optional online store — built for Indian jewellers, not adapted from generic ERP.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/onboarding/start" className="erp-btn-primary w-auto px-6 py-2.5">
              Start 2-month free trial
            </Link>
            <Link href="#request-demo" className="erp-btn-secondary px-6 py-2.5 inline-flex items-center">
              Request a demo
            </Link>
            <Link
              href="/shop/shree-hari-jewels"
              className="erp-btn-secondary px-6 py-2.5 inline-flex items-center"
            >
              Browse demo store
            </Link>
          </div>
        </div>
        <HeroScreenshotCarousel />
      </div>
    </section>
  );
}
