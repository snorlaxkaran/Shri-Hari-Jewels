import Link from "next/link";
import dynamic from "next/dynamic";
import { HeroSection } from "./_components/HeroSection";
import { MarketingHeader } from "./_components/MarketingHeader";
import { StatsBar } from "./_components/StatsBar";
import { LazySection } from "./_components/LazySection";

const ModuleShowcase = dynamic(
  () => import("./_components/ModuleShowcase").then((m) => m.ModuleShowcase),
  { loading: () => <div className="mkt-section mkt-shell"><div className="mkt-skeleton" /></div> },
);

const DeepFeaturesSection = dynamic(
  () => import("./_components/DeepFeaturesSection").then((m) => m.DeepFeaturesSection),
);

const FAQSection = dynamic(
  () => import("./_components/FAQSection").then((m) => m.FAQSection),
);

const ImplementationSection = dynamic(
  () => import("./_components/ImplementationSection").then((m) => m.ImplementationSection),
);

const MarketingFooter = dynamic(
  () => import("./_components/MarketingFooter").then((m) => m.MarketingFooter),
);

export default function OnboardingPortfolioPage() {
  return (
    <div className="mkt-page min-h-screen flex flex-col">
      <MarketingHeader />
      <HeroSection />
      <StatsBar />

      <LazySection minHeight="36rem">
        <div id="modules">
          <ModuleShowcase />
        </div>
      </LazySection>

      <LazySection minHeight="28rem">
        <div id="features">
          <DeepFeaturesSection />
        </div>
      </LazySection>

      <LazySection minHeight="20rem">
        <div id="faq">
          <FAQSection />
        </div>
      </LazySection>

      <LazySection minHeight="24rem">
        <div id="request-demo">
          <ImplementationSection />
        </div>
      </LazySection>

      <section className="mkt-cta-band">
        <div className="mkt-shell">
          <h2 className="mkt-display text-3xl sm:text-4xl">Ready to run a calmer counter?</h2>
          <p className="max-w-md mx-auto">
            Start your free trial today — or request a walkthrough for multi-branch setups.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/onboarding/start" className="mkt-btn mkt-btn-dark bg-white text-[#171717] hover:bg-[#f5f5f5]">
              Start free trial →
            </Link>
            <Link href="#request-demo" className="mkt-btn mkt-btn-outline border-[#525252] text-white hover:bg-white/10">
              Request demo
            </Link>
          </div>
        </div>
      </section>

      <MarketingFooter />
    </div>
  );
}
